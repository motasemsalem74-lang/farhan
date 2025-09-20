import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/firebase/firebase-config.template'

/**
 * Fix warehouse ID mismatches between agents and inventory items
 * This script will:
 * 1. Get all agents and their warehouse IDs
 * 2. Get all warehouses and find matching ones by name
 * 3. Update inventory items to use the correct warehouse IDs
 */
export async function fixWarehouseIds() {
  try {
    console.log('🔧 Starting warehouse ID fix...')
    
    // 1. Get all agents
    const agentsSnapshot = await getDocs(collection(db, 'agents'))
    const agents = agentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[]
    
    console.log('📋 Found agents:', agents.length)
    
    // 2. Get all warehouses
    const warehousesSnapshot = await getDocs(collection(db, 'warehouses'))
    const warehouses = warehousesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[]
    
    console.log('🏪 Found warehouses:', warehouses.length)
    
    // 3. Get all inventory items
    const inventorySnapshot = await getDocs(collection(db, 'inventory_items'))
    const inventoryItems = inventorySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[]
    
    console.log('📦 Found inventory items:', inventoryItems.length)
    
    // 4. For each agent, find their warehouse and update items
    for (const agent of agents) {
      if (!agent.warehouseId) continue
      
      console.log(`\n👤 Processing agent: ${agent.name}`)
      console.log(`   Agent warehouse ID: ${agent.warehouseId}`)
      
      // Find warehouse that might belong to this agent (by name pattern)
      const agentWarehouse = warehouses.find(w => 
        w.name && w.name.includes(agent.name) || 
        w.agentId === agent.id
      )
      
      if (agentWarehouse) {
        console.log(`   Found matching warehouse: ${agentWarehouse.name} (${agentWarehouse.id})`)
        
        // Check if warehouse ID needs to be updated
        if (agentWarehouse.id !== agent.warehouseId) {
          console.log(`   ⚠️  Warehouse ID mismatch detected!`)
          console.log(`   Agent has: ${agent.warehouseId}`)
          console.log(`   Warehouse actual ID: ${agentWarehouse.id}`)
          
          // Find items that should belong to this agent's warehouse
          const agentItems = inventoryItems.filter(item => 
            (item as any).currentWarehouseId === agentWarehouse.id ||
            (item as any).warehouseName === agentWarehouse.name
          )
          
          console.log(`   📦 Found ${agentItems.length} items that should belong to this agent`)
          
          // Update agent's warehouse ID to match the actual warehouse
          await updateDoc(doc(db, 'agents', agent.id), {
            warehouseId: agentWarehouse.id
          })
          console.log(`   ✅ Updated agent warehouse ID to: ${agentWarehouse.id}`)
          
          // Update inventory items to use the correct warehouse ID
          for (const item of agentItems) {
            if ((item as any).currentWarehouseId !== agentWarehouse.id) {
              await updateDoc(doc(db, 'inventory_items', item.id), {
                currentWarehouseId: agentWarehouse.id,
                warehouseName: agentWarehouse.name
              })
              console.log(`   📦 Updated item ${item.id} warehouse ID`)
            }
          }
        } else {
          console.log(`   ✅ Warehouse ID already correct`)
        }
      } else {
        console.log(`   ❌ No matching warehouse found for agent`)
      }
    }
    
    // 5. Summary
    console.log('\n📊 Fix Summary:')
    const updatedAgentsSnapshot = await getDocs(collection(db, 'agents'))
    const updatedInventorySnapshot = await getDocs(collection(db, 'inventory_items'))
    
    console.log(`✅ Processed ${updatedAgentsSnapshot.docs.length} agents`)
    console.log(`✅ Processed ${updatedInventorySnapshot.docs.length} inventory items`)
    console.log('🎉 Warehouse ID fix completed!')
    
    return {
      success: true,
      agentsProcessed: updatedAgentsSnapshot.docs.length,
      itemsProcessed: updatedInventorySnapshot.docs.length
    }
    
  } catch (error) {
    console.error('❌ Error fixing warehouse IDs:', error)
    throw error
  }
}

/**
 * Alternative approach: Fix by updating inventory items to match agent warehouse IDs
 */
export async function fixInventoryWarehouseIds() {
  try {
    console.log('🔧 Starting inventory warehouse ID fix...')
    
    // Get all agents with their warehouse IDs
    const agentsSnapshot = await getDocs(collection(db, 'agents'))
    const agents = agentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[]
    
    // Get all inventory items
    const inventorySnapshot = await getDocs(collection(db, 'inventory_items'))
    const inventoryItems = inventorySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[]
    
    console.log(`📋 Found ${agents.length} agents and ${inventoryItems.length} inventory items`)
    
    let updatedItems = 0
    
    // For each inventory item, check if it should belong to an agent's warehouse
    for (const item of inventoryItems) {
      const itemData = item as any
      
      // Skip if item already has correct warehouse assignment
      if (!itemData.currentWarehouseId) continue
      
      // Find if this item's warehouse belongs to an agent
      const ownerAgent = agents.find(agent => {
        // Check if warehouse name contains agent name or if there's a direct match
        return itemData.warehouseName && itemData.warehouseName.includes(agent.name)
      })
      
      if (ownerAgent && ownerAgent.warehouseId !== itemData.currentWarehouseId) {
        console.log(`📦 Updating item ${item.id} from warehouse ${itemData.currentWarehouseId} to ${ownerAgent.warehouseId}`)
        
        await updateDoc(doc(db, 'inventory_items', item.id), {
          currentWarehouseId: ownerAgent.warehouseId,
          warehouseName: `مخزن ${ownerAgent.name}`
        })
        
        updatedItems++
      }
    }
    
    console.log(`✅ Updated ${updatedItems} inventory items`)
    console.log('🎉 Inventory warehouse ID fix completed!')
    
    return {
      success: true,
      itemsUpdated: updatedItems
    }
    
  } catch (error) {
    console.error('❌ Error fixing inventory warehouse IDs:', error)
    throw error
  }
}
