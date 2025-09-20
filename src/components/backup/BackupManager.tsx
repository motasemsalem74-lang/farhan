import { useState } from 'react'
import { Download, Upload, Database, Shield, Clock, AlertCircle } from 'lucide-react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { toast } from 'sonner'

import { auth, db } from '@/firebase/firebase-config.template'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserData } from '@/hooks/useUserData'
import { isSuperAdmin } from '@/lib/utils'

interface BackupData {
  timestamp: Date
  collections: {
    users: any[]
    inventory: any[]
    sales: any[]
    agents: any[]
    documents: any[]
  }
  metadata: {
    version: string
    exportedBy: string
    totalRecords: number
  }
}

export function BackupManager() {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [lastBackup, setLastBackup] = useState<Date | null>(null)

  const canAccessBackup = userData && isSuperAdmin(userData.role)

  const exportData = async () => {
    if (!canAccessBackup) {
      toast.error('غير مصرح لك بالوصول لنظام النسخ الاحتياطي')
      return
    }

    try {
      setIsExporting(true)
      
      // Collect data from all collections
      const collections = ['users', 'inventory', 'sales', 'agents', 'documents']
      const backupData: BackupData = {
        timestamp: new Date(),
        collections: {
          users: [],
          inventory: [],
          sales: [],
          agents: [],
          documents: []
        },
        metadata: {
          version: '1.0.0',
          exportedBy: userData?.displayName || 'Unknown',
          totalRecords: 0
        }
      }

      let totalRecords = 0

      for (const collectionName of collections) {
        const snapshot = await getDocs(collection(db, collectionName))
        const data: any[] = []
        
        snapshot.forEach(doc => {
          data.push({
            id: doc.id,
            ...doc.data(),
            // Convert Firestore timestamps to ISO strings
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
            updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
          })
        })

        backupData.collections[collectionName as keyof typeof backupData.collections] = data
        totalRecords += data.length
      }

      backupData.metadata.totalRecords = totalRecords

      // Create and download backup file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { 
        type: 'application/json' 
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `al-farhan-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Log backup activity
      await setDoc(doc(db, 'backup_logs', `backup_${Date.now()}`), {
        type: 'export',
        timestamp: serverTimestamp(),
        exportedBy: userData?.uid,
        totalRecords,
        status: 'success'
      })

      setLastBackup(new Date())
      toast.success(`تم تصدير النسخة الاحتياطية بنجاح (${totalRecords} سجل)`)
      
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('حدث خطأ أثناء تصدير النسخة الاحتياطية')
    } finally {
      setIsExporting(false)
    }
  }

  const importData = async (file: File) => {
    if (!canAccessBackup) {
      toast.error('غير مصرح لك بالوصول لنظام النسخ الاحتياطي')
      return
    }

    try {
      setIsImporting(true)
      
      const text = await file.text()
      const backupData: BackupData = JSON.parse(text)
      
      // Validate backup structure
      if (!backupData.collections || !backupData.metadata) {
        throw new Error('Invalid backup file structure')
      }

      let importedRecords = 0
      
      // Import data to collections
      for (const [collectionName, data] of Object.entries(backupData.collections)) {
        if (Array.isArray(data)) {
          for (const record of data) {
            const { id, ...recordData } = record
            
            // Convert ISO strings back to Firestore timestamps if needed
            if (recordData.createdAt && typeof recordData.createdAt === 'string') {
              recordData.createdAt = new Date(recordData.createdAt)
            }
            if (recordData.updatedAt && typeof recordData.updatedAt === 'string') {
              recordData.updatedAt = new Date(recordData.updatedAt)
            }
            
            await setDoc(doc(db, collectionName, id), recordData, { merge: true })
            importedRecords++
          }
        }
      }

      // Log import activity
      await setDoc(doc(db, 'backup_logs', `import_${Date.now()}`), {
        type: 'import',
        timestamp: serverTimestamp(),
        importedBy: userData?.uid,
        totalRecords: importedRecords,
        originalBackupDate: backupData.timestamp,
        status: 'success'
      })

      toast.success(`تم استيراد النسخة الاحتياطية بنجاح (${importedRecords} سجل)`)
      
    } catch (error) {
      console.error('Error importing data:', error)
      toast.error('حدث خطأ أثناء استيراد النسخة الاحتياطية')
    } finally {
      setIsImporting(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        importData(file)
      } else {
        toast.error('يرجى اختيار ملف JSON صالح')
      }
    }
  }

  if (!userData) {
    return <LoadingSpinner text="جاري تحميل بيانات المستخدم..." />
  }

  if (!canAccessBackup) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2 arabic-text">
          غير مصرح لك بالوصول
        </h2>
        <p className="text-gray-600 arabic-text">
          ليس لديك صلاحية للوصول لنظام النسخ الاحتياطي
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 arabic-text">النسخ الاحتياطي</h1>
        <p className="text-gray-600 arabic-text">إدارة النسخ الاحتياطية واستعادة البيانات</p>
      </div>

      {/* Backup Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 arabic-text">
            <Database className="h-5 w-5" />
            حالة النسخ الاحتياطي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="font-medium text-blue-900 arabic-text">آخر نسخة احتياطية</p>
              <p className="text-sm text-blue-700">
                {lastBackup ? lastBackup.toLocaleString('ar-SA') : 'لم يتم إنشاء نسخة بعد'}
              </p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-green-900 arabic-text">حالة النظام</p>
              <p className="text-sm text-green-700">نشط وآمن</p>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <p className="font-medium text-yellow-900 arabic-text">التوصية</p>
              <p className="text-sm text-yellow-700">نسخة احتياطية أسبوعية</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 arabic-text">
            <Download className="h-5 w-5" />
            تصدير النسخة الاحتياطية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600 arabic-text">
              قم بتصدير جميع بيانات النظام في ملف JSON آمن يمكن استخدامه لاستعادة البيانات لاحقاً.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 arabic-text">تنبيه مهم</h4>
                  <p className="text-sm text-yellow-700 arabic-text mt-1">
                    تأكد من حفظ ملف النسخة الاحتياطية في مكان آمن. يحتوي الملف على جميع بيانات النظام الحساسة.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={exportData} 
              disabled={isExporting}
              className="w-full md:w-auto"
            >
              {isExporting ? (
                <>
                  <LoadingSpinner className="ml-2 h-4 w-4" />
                  جاري التصدير...
                </>
              ) : (
                <>
                  <Download className="ml-2 h-4 w-4" />
                  تصدير النسخة الاحتياطية
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 arabic-text">
            <Upload className="h-5 w-5" />
            استيراد النسخة الاحتياطية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600 arabic-text">
              قم باستيراد نسخة احتياطية سابقة لاستعادة البيانات. سيتم دمج البيانات مع البيانات الحالية.
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800 arabic-text">تحذير</h4>
                  <p className="text-sm text-red-700 arabic-text mt-1">
                    عملية الاستيراد قد تؤثر على البيانات الحالية. تأكد من إنشاء نسخة احتياطية قبل المتابعة.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={isImporting}
                className="hidden"
                id="backup-file-input"
              />
              <label htmlFor="backup-file-input">
                <Button 
                  as="span"
                  variant="outline"
                  disabled={isImporting}
                  className="cursor-pointer"
                >
                  {isImporting ? (
                    <>
                      <LoadingSpinner className="ml-2 h-4 w-4" />
                      جاري الاستيراد...
                    </>
                  ) : (
                    <>
                      <Upload className="ml-2 h-4 w-4" />
                      اختيار ملف النسخة الاحتياطية
                    </>
                  )}
                </Button>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle className="arabic-text">أفضل الممارسات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <p className="text-gray-700 arabic-text">قم بإنشاء نسخة احتياطية أسبوعياً على الأقل</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <p className="text-gray-700 arabic-text">احفظ النسخ الاحتياطية في أماكن متعددة (محلي، سحابي)</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <p className="text-gray-700 arabic-text">اختبر استعادة النسخ الاحتياطية بشكل دوري</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <p className="text-gray-700 arabic-text">احم ملفات النسخ الاحتياطية بكلمة مرور قوية</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
