// سكريبت إنشاء المخازن الأساسية
// تشغيل الأمر: node createWarehouses.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs } from 'firebase/firestore';

// إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBvOkBH0ImXbWZQhzSzTLwZBJvzFbqs2Ac",
  authDomain: "al-farhan-transport.firebaseapp.com",
  projectId: "al-farhan-transport",
  storageBucket: "al-farhan-transport.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
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
  console.log('🏗️  بدء إنشاء المخازن الأساسية...\n');
  
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
    
    console.log('🎉 تم الانتهاء من إنشاء المخازن الأساسية بنجاح!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء المخازن:', error.message);
    process.exit(1);
  }
}

// تشغيل السكريبت
createWarehouses();
