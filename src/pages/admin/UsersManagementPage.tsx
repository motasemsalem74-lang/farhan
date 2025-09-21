import { useState, useEffect } from 'react'
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Edit,
  Trash2,
  Shield,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Save,
  X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from '@/lib/utils'

// Badge component inline
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
import { useUserData } from '@/hooks/useUserData'
import { useAuthState } from 'react-firebase-hooks/auth'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase/firebase-config.template'
import { toast } from 'sonner'
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../../firebase/firebase-config.template'

interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  agentId?: string
  warehouseId?: string
  isActive: boolean
  department?: string
  permissions?: string[]
  createdAt: any
  lastLoginAt?: any
}

// لا نحتاج Agent و Warehouse interfaces لأننا أزلنا دور الوكيل

import { USER_ROLES, canManageUsers } from '@/lib/permissions'

// استخدام الأدوار من نظام الصلاحيات
const ROLES = USER_ROLES

export function UsersManagementPage() {
  const [user] = useAuthState(auth)
  const { userData } = useUserData(user?.uid)
  
  // دالة للتحقق من صلاحيات المدير
  const isAdminOrHigher = () => {
    return userData?.role === 'super_admin' || userData?.role === 'admin'
  }
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [creating, setCreating] = useState(false)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'sales_employee',
    department: ''
  })

  useEffect(() => {
    console.log('🔐 Checking user permissions...')
    console.log('👤 Current user data:', userData)
    console.log('🎭 User role:', userData?.role)
    
    if (userData) {
      const hasPermissions = userData.role === 'super_admin' || userData.role === 'admin'
      console.log('✅ Is admin or higher:', hasPermissions)
      
      if (hasPermissions) {
        console.log('🚀 User has permissions, loading data...')
        loadData()
      } else {
        console.log('❌ User does not have permissions')
      }
    }
  }, [userData])

  const loadData = async () => {
    try {
      setLoading(true)
      console.log('🔄 Loading users data...')
      
      // تحميل المستخدمين
      const usersSnapshot = await getDocs(collection(db, 'users'))
      console.log('📊 Users snapshot size:', usersSnapshot.size)
      
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[]
      
      console.log('👥 Users data loaded:', usersData.length, usersData)
      
      setUsers(usersData)
      
      console.log('✅ All data loaded successfully')
      console.log('📋 Current users state:', usersData)
    } catch (error) {
      console.error('❌ Error loading data:', error)
      toast.error('فشل في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    if (!user) return false
    
    const matchesSearch = 
      (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = selectedRole === 'all' || user.role === selectedRole
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'active' && user.isActive) ||
      (selectedStatus === 'inactive' && !user.isActive)

    return matchesSearch && matchesRole && matchesStatus
  })
  
  // Debug logs للفلترة (فقط عند التغيير)
  useEffect(() => {
    console.log('🔍 Filtering users:')
    console.log('📊 Total users:', users.length)
    console.log('🔎 Search term:', searchTerm)
    console.log('🎭 Selected role:', selectedRole)
    console.log('📈 Selected status:', selectedStatus)
    console.log('✅ Filtered users:', filteredUsers.length, filteredUsers)
  }, [users.length, searchTerm, selectedRole, selectedStatus])

  const handleCreateUser = async () => {
    if (!userData?.id || !newUser.name || !newUser.email || !newUser.password) {
      toast.error('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    if (newUser.password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }

    try {
      setCreating(true)
      console.log('🔐 Creating Firebase Auth user...')
      
      // إنشاء المستخدم في Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password)
      const firebaseUser = userCredential.user
      
      console.log('✅ Firebase Auth user created:', firebaseUser.uid)
      
      // إنشاء بيانات المستخدم في Firestore
      const userRole = ROLES.find(r => r.name === newUser.role)
      const userDoc = {
        uid: firebaseUser.uid,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone || '',
        role: newUser.role,
        department: newUser.department || '',
        permissions: userRole?.permissions || [],
        isActive: true,
        createdAt: serverTimestamp(),
        createdBy: userData.id
      }
      
      console.log('💾 Saving user data to Firestore...')
      
      // حفظ بيانات المستخدم في Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), userDoc)
      
      toast.success('تم إنشاء المستخدم بنجاح')
      setShowCreateDialog(false)
      setNewUser({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'sales_employee',
        department: ''
      })
      await loadData()
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error('فشل في إنشاء المستخدم')
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateUser = async (user: User) => {
    if (!userData?.id) return

    try {
      const userRole = ROLES.find(r => r.name === user.role)
      
      const updateData: any = {
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        department: user.department || '',
        permissions: userRole?.permissions || [],
        isActive: user.isActive,
        updatedAt: serverTimestamp(),
        updatedBy: userData.id
      }
      
      // لا نضيف agentId أو warehouseId لأننا أزلنا دور الوكيل
      
      await updateDoc(doc(db, 'users', user.id), updateData)
      
      toast.success('تم تحديث المستخدم بنجاح')
      setEditingUser(null)
      await loadData()
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('فشل في تحديث المستخدم')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!userData?.id) return

    try {
      await deleteDoc(doc(db, 'users', userId))
      toast.success('تم حذف المستخدم بنجاح')
      await loadData()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('فشل في حذف المستخدم')
    }
  }

  const handleToggleUserStatus = async (user: User) => {
    if (!userData?.id) return

    try {
      await updateDoc(doc(db, 'users', user.id), {
        isActive: !user.isActive,
        updatedAt: serverTimestamp(),
        updatedBy: userData.id
      })
      
      toast.success(`تم ${user.isActive ? 'إلغاء تفعيل' : 'تفعيل'} المستخدم`)
      await loadData()
    } catch (error) {
      console.error('Error updating user status:', error)
      toast.error('فشل في تحديث حالة المستخدم')
    }
  }

  const getRoleName = (roleId: string) => {
    const role = ROLES.find(r => r.name === roleId)
    return role?.displayName || 'غير محدد'
  }

  const getRoleColor = (roleId: string) => {
    switch (roleId) {
      case 'super_admin': return 'bg-red-100 text-red-800'
      case 'admin_manager': return 'bg-purple-100 text-purple-800'
      case 'sales_employee': return 'bg-blue-100 text-blue-800'
      case 'agent': return 'bg-orange-100 text-orange-800'
      case 'admin': return 'bg-indigo-100 text-indigo-800' // للمدير الحالي
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // لا نحتاج دوال getAgentName و getWarehouseName لأننا أزلنا دور الوكيل

  if (!isAdminOrHigher()) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto text-red-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              غير مصرح بالوصول
            </h2>
            <p className="text-gray-600">
              ليس لديك الصلاحيات المطلوبة لإدارة المستخدمين
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h1>
            <p className="text-gray-600">إدارة حسابات المستخدمين والصلاحيات</p>
          </div>
        </div>
        
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          إضافة مستخدم
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="البحث بالاسم، البريد الإلكتروني، أو الهاتف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">جميع الأدوار</option>
              {ROLES.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.displayName}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            المستخدمين ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">جاري تحميل المستخدمين...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مستخدمين في النظام</h3>
              <p className="text-gray-600">ابدأ بإضافة أول مستخدم</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مستخدمين</h3>
              <p className="text-gray-600">لا توجد مستخدمين تطابق المعايير المحددة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-3">المستخدم</th>
                    <th className="text-right p-3">الدور</th>
                    <th className="text-right p-3">القسم</th>
                    <th className="text-right p-3">الحالة</th>
                    <th className="text-right p-3">آخر دخول</th>
                    <th className="text-right p-3">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {(user.name || 'مستخدم').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.name || 'غير محدد'}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Mail className="h-3 w-3" />
                              {user.email || 'غير محدد'}
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Phone className="h-3 w-3" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={getRoleColor(user.role)}>
                          {getRoleName(user.role)}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-600">
                          {user.department || '-'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {user.isActive ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className={user.isActive ? 'text-green-600' : 'text-red-600'}>
                            {user.isActive ? 'نشط' : 'غير نشط'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-gray-600">
                          {user.lastLoginAt && user.lastLoginAt.toDate
                            ? new Date(user.lastLoginAt.toDate()).toLocaleDateString('ar-EG')
                            : 'لم يسجل دخول'
                          }
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleUserStatus(user)}
                          >
                            {user.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle>إضافة مستخدم جديد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  placeholder="أدخل اسم المستخدم"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  placeholder="أدخل البريد الإلكتروني"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                  placeholder="أدخل رقم الهاتف"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" required>كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="أدخل كلمة المرور (6 أحرف على الأقل)"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">الدور</Label>
                <select
                  id="role"
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {ROLES.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.displayName}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* لا نحتاج حقول الوكيل والمخزن لأننا أزلنا دور الوكيل */}
              
              <div className="space-y-2">
                <Label htmlFor="department">القسم</Label>
                <Input
                  id="department"
                  value={newUser.department}
                  onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                  placeholder="أدخل القسم"
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateUser} 
                  className="flex-1"
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      إنشاء
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit User Dialog */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle>تعديل المستخدم</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">الاسم</Label>
                <Input
                  id="edit-name"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-email">البريد الإلكتروني</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-phone">رقم الهاتف</Label>
                <Input
                  id="edit-phone"
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-role">الدور</Label>
                <select
                  id="edit-role"
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {ROLES.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.displayName}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* لا نحتاج حقول الوكيل والمخزن لأننا أزلنا دور الوكيل */}
              
              <div className="space-y-2">
                <Label htmlFor="edit-department">القسم</Label>
                <Input
                  id="edit-department"
                  value={editingUser.department || ''}
                  onChange={(e) => setEditingUser({...editingUser, department: e.target.value})}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={() => handleUpdateUser(editingUser)} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  حفظ
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingUser(null)}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
