import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/firebase/firebase-config.template'

/**
 * Creates initial super admin user for the system
 * This should be run once to set up the first user
 */
export async function createInitialSuperAdmin() {
  try {
    // Create authentication user
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      'admin@alfarhan.com', 
      'admin123456'
    )
    
    const user = userCredential.user
    
    // Create user document in Firestore
    const userData = {
      username: 'admin@alfarhan.com',
      email: 'admin@alfarhan.com',
      displayName: 'مدير النظام',
      role: 'super_admin',
      phoneNumber: '01000000000',
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    await setDoc(doc(db, 'users', user.uid), userData)
    
    console.log('✅ تم إنشاء المستخدم الأولي بنجاح')
    console.log('البريد الإلكتروني: admin@alfarhan.com')
    console.log('كلمة المرور: admin123456')
    
    return { success: true, user: userData }
    
  } catch (error: any) {
    console.error('❌ خطأ في إنشاء المستخدم الأولي:', error)
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('المستخدم موجود بالفعل')
      return { success: false, error: 'المستخدم موجود بالفعل' }
    }
    
    return { success: false, error: error.message }
  }
}

/**
 * Creates sample users for testing
 */
export async function createSampleUsers() {
  const users = [
    {
      email: 'agent1@alfarhan.com',
      password: 'agent123',
      displayName: 'وكيل نموذجي 1',
      role: 'agent'
    },
    {
      email: 'showroom@alfarhan.com', 
      password: 'showroom123',
      displayName: 'مستخدم صالة عرض',
      role: 'showroom_user'
    }
  ]
  
  for (const userData of users) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      )
      
      const user = userCredential.user
      
      const docData = {
        username: userData.email,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      await setDoc(doc(db, 'users', user.uid), docData)
      
      console.log(`✅ تم إنشاء المستخدم: ${userData.email}`)
      
    } catch (error: any) {
      if (error.code !== 'auth/email-already-in-use') {
        console.error(`❌ خطأ في إنشاء المستخدم ${userData.email}:`, error)
      }
    }
  }
}
