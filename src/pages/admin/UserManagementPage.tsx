import { Routes, Route, Link } from 'react-router-dom'
import { Users, Building2, Settings, Database } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CreateDefaultWarehouses } from './CreateDefaultWarehouses'
import { FixWarehouseIds } from './FixWarehouseIds'
import { UsersManagementPage } from './UsersManagementPage'

export function UserManagementPage() {
  return (
    <div className="space-y-6">
      <Routes>
        <Route path="/warehouses" element={<CreateDefaultWarehouses />} />
        <Route path="/fix-warehouse-ids" element={<FixWarehouseIds />} />
        <Route path="/users" element={<UsersManagementPage />} />
        <Route path="/" element={<AdminDashboard />} />
      </Routes>
    </div>
  )
}

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 arabic-text">
          لوحة الإدارة
        </h1>
        <p className="text-gray-600 arabic-text">
          إدارة النظام والمستخدمين والإعدادات الأساسية
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create Default Warehouses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              إنشاء المخازن الأساسية
            </CardTitle>
            <CardDescription>
              إضافة المخزن الرئيسي ومخزن المعرض
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 arabic-text mb-4">
              إنشاء المخازن الأساسية المطلوبة للنظام مع منع التكرار
            </p>
            <Link to="/admin/warehouses">
              <Button className="w-full">
                <Building2 className="ml-2 h-4 w-4" />
                إنشاء المخازن
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              إدارة المستخدمين
            </CardTitle>
            <CardDescription>
              إضافة وتعديل وحذف المستخدمين والصلاحيات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 arabic-text mb-4">
              إدارة حسابات المستخدمين والأدوار والصلاحيات
            </p>
            <Link to="/admin/users">
              <Button className="w-full">
                <Users className="ml-2 h-4 w-4" />
                إدارة المستخدمين
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Fix Warehouse IDs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              إصلاح معرفات المخازن
            </CardTitle>
            <CardDescription>
              حل مشاكل عدم تطابق معرفات المخازن
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 arabic-text mb-4">
              إصلاح مشاكل عدم تطابق معرفات المخازن بين الوكلاء والمخزون
            </p>
            <Link to="/admin/fix-warehouse-ids">
              <Button className="w-full">
                <Database className="ml-2 h-4 w-4" />
                إصلاح المعرفات
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              إعدادات النظام
            </CardTitle>
            <CardDescription>
              إعدادات عامة للنظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 arabic-text mb-4">
              قريباً - إعدادات النظام العامة
            </p>
            <Button disabled className="w-full">
              <Settings className="ml-2 h-4 w-4" />
              قريباً
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}