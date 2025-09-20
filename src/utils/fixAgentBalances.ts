import { collection, getDocs, doc, updateDoc, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/firebase-config.template'

/**
 * إصلاح أرصدة الوكلاء بناءً على معاملاتهم الفعلية
 */
export async function fixAgentBalances() {
  console.log('🔧 بدء إصلاح أرصدة الوكلاء...')
  
  try {
    // جلب جميع الوكلاء
    const agentsSnapshot = await getDocs(collection(db, 'agents'))
    const agents = agentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    console.log(`📊 تم العثور على ${agents.length} وكيل`)
    
    for (const agent of agents) {
      console.log(`\n🔍 معالجة الوكيل: ${agent.name} (${agent.id})`)
      
      // جلب جميع معاملات الوكيل
      const transactionsQuery = query(
        collection(db, 'agent_transactions'),
        where('agentId', '==', agent.id),
        orderBy('createdAt', 'asc')
      )
      
      const transactionsSnapshot = await getDocs(transactionsQuery)
      const transactions = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      console.log(`📋 تم العثور على ${transactions.length} معاملة`)
      
      // حساب الرصيد الصحيح
      let calculatedBalance = 0
      
      for (const transaction of transactions) {
        const amount = Number(transaction.amount) || 0
        
        switch (transaction.type) {
          case 'commission':
            // العمولة تُضاف للرصيد (إيجابي للوكيل)
            calculatedBalance += amount
            console.log(`  ✅ عمولة: +${amount} = ${calculatedBalance}`)
            break
            
          case 'debt':
          case 'debt_increase':
            // المديونية تُخصم من الرصيد (سالب للوكيل)
            calculatedBalance -= Math.abs(amount)
            console.log(`  ❌ مديونية: -${Math.abs(amount)} = ${calculatedBalance}`)
            break
            
          case 'payment':
          case 'debt_decrease':
            // الدفع يُضاف للرصيد (يقلل المديونية)
            calculatedBalance += Math.abs(amount)
            console.log(`  💰 دفع: +${Math.abs(amount)} = ${calculatedBalance}`)
            break
            
          case 'transfer_in':
            // تحويل داخل (استلام بضاعة) - مديونية
            calculatedBalance -= Math.abs(amount)
            console.log(`  📦 تحويل داخل: -${Math.abs(amount)} = ${calculatedBalance}`)
            break
            
          case 'transfer_out':
            // تحويل خارج (إرسال بضاعة) - ائتمان
            calculatedBalance += Math.abs(amount)
            console.log(`  📤 تحويل خارج: +${Math.abs(amount)} = ${calculatedBalance}`)
            break
            
          default:
            console.log(`  ⚠️ نوع معاملة غير معروف: ${transaction.type}`)
        }
      }
      
      const currentBalance = Number(agent.currentBalance) || 0
      
      console.log(`📊 النتائج:`)
      console.log(`  الرصيد الحالي: ${currentBalance}`)
      console.log(`  الرصيد المحسوب: ${calculatedBalance}`)
      console.log(`  الفرق: ${calculatedBalance - currentBalance}`)
      
      // تحديث الرصيد إذا كان مختلف
      if (Math.abs(calculatedBalance - currentBalance) > 0.01) {
        await updateDoc(doc(db, 'agents', agent.id), {
          currentBalance: calculatedBalance,
          updatedAt: new Date(),
          balanceFixedAt: new Date()
        })
        
        console.log(`✅ تم تحديث رصيد الوكيل ${agent.name} من ${currentBalance} إلى ${calculatedBalance}`)
      } else {
        console.log(`✅ رصيد الوكيل ${agent.name} صحيح`)
      }
    }
    
    console.log('\n🎉 تم إكمال إصلاح أرصدة الوكلاء بنجاح!')
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح أرصدة الوكلاء:', error)
    throw error
  }
}

/**
 * إصلاح إجماليات المبيعات والعمولات للوكلاء
 */
export async function fixAgentTotals() {
  console.log('🔧 بدء إصلاح إجماليات الوكلاء...')
  
  try {
    // جلب جميع الوكلاء
    const agentsSnapshot = await getDocs(collection(db, 'agents'))
    const agents = agentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    for (const agent of agents) {
      console.log(`\n🔍 معالجة إجماليات الوكيل: ${agent.name}`)
      
      // جلب جميع مبيعات الوكيل
      const salesQuery = query(
        collection(db, 'sales'),
        where('agentId', '==', agent.id)
      )
      
      const salesSnapshot = await getDocs(salesQuery)
      const sales = salesSnapshot.docs.map(doc => doc.data())
      
      // حساب الإجماليات
      let totalSales = 0
      let totalCommission = 0
      
      for (const sale of sales) {
        totalSales += Number(sale.salePrice) || 0
        totalCommission += Number(sale.agentCommission) || 0
      }
      
      console.log(`📊 إجماليات محسوبة:`)
      console.log(`  إجمالي المبيعات: ${totalSales}`)
      console.log(`  إجمالي العمولة: ${totalCommission}`)
      
      // تحديث الإجماليات
      await updateDoc(doc(db, 'agents', agent.id), {
        totalSales: totalSales,
        totalCommission: totalCommission,
        updatedAt: new Date(),
        totalsFixedAt: new Date()
      })
      
      console.log(`✅ تم تحديث إجماليات الوكيل ${agent.name}`)
    }
    
    console.log('\n🎉 تم إكمال إصلاح إجماليات الوكلاء بنجاح!')
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح إجماليات الوكلاء:', error)
    throw error
  }
}

/**
 * إصلاح شامل لجميع بيانات الوكلاء
 */
export async function fixAllAgentData() {
  console.log('🚀 بدء الإصلاح الشامل لبيانات الوكلاء...')
  
  try {
    await fixAgentTotals()
    await fixAgentBalances()
    
    console.log('🎉 تم إكمال الإصلاح الشامل بنجاح!')
    
  } catch (error) {
    console.error('❌ خطأ في الإصلاح الشامل:', error)
    throw error
  }
}
