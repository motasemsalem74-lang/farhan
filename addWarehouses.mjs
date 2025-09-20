// سكريبت إنشاء المخازن الأساسية على Firebase
// تشغيل: node addWarehouses.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs } from 'firebase/firestore';

// إعدادات Firebase - استخدم إعدادات مشروعك الحقيقية
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com", 
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// المخازن المطلوب إنشاؤها
const warehouses = [
  {
    name: 'المخزن الرئيسي',
    location: 'الرياض',
    description: 'المخزن الرئيسي لتخزين الموتوسيكلات'
  },
  {
    name: 'مخزن المعرض', 
    location: 'الرياض - المعرض',
    description: 'مخزن المعرض لعرض الموتوسيكلات للعملاء'
  }
];

async function createWarehouses() {
  console.log('🏗️  بدء إنشاء المخازن الأساسية على Firebase...\n');
  
  try {
    for (const warehouseData of warehouses) {
      console.log(`🔍 فحص وجود المخزن: ${warehouseData.name}`);
      
      // فحص إذا كان المخزن موجود
      const existingQuery = query(
        collection(db, 'warehouses'),
        where('name', '==', warehouseData.name)
      );
      
      const existingSnapshot = await getDocs(existingQuery);
      
      if (existingSnapshot.empty) {
        // إنشاء المخزن الجديد
        const newWarehouse = {
          name: warehouseData.name,
          location: warehouseData.location,
          description: warehouseData.description,
          isActive: true,
          currentStock: 0,
          managerId: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system'
          // بدون حقل capacity - سعة غير محدودة
        };
        
        const docRef = await addDoc(collection(db, 'warehouses'), newWarehouse);
        console.log(`✅ تم إنشاء المخزن: ${warehouseData.name}`);
        console.log(`   📍 الموقع: ${warehouseData.location}`);
        console.log(`   🆔 معرف المخزن: ${docRef.id}\n`);
      } else {
        console.log(`⚠️  المخزن موجود بالفعل: ${warehouseData.name}\n`);
      }
    }
    
    console.log('🎉 تم الانتهاء من إنشاء المخازن على Firebase بنجاح!');
    console.log('📱 يمكنك الآن رؤية المخازن في التطبيق');
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء المخازن:', error.message);
    console.log('\n💡 تأكد من:');
    console.log('   - إعدادات Firebase صحيحة');
    console.log('   - الاتصال بالإنترنت');
    console.log('   - صلاحيات Firestore');
  }
}

// تشغيل السكريبت
createWarehouses();
