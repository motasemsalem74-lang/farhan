import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  writeBatch
} from 'firebase/firestore'
import { 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  deleteUser as deleteAuthUser
} from 'firebase/auth'
import { db, auth } from './firebase'
import { 
  User, 
  Role, 
  Permission, 
  UserSession, 
  UserActivity,
  UserInvitation,
  DEFAULT_ROLES
} from '../types/users'

export class UserService {
  private static instance: UserService

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService()
    }
    return UserService.instance
  }

  // Initialize default roles
  async initializeDefaultRoles(): Promise<void> {
    try {
      const rolesSnapshot = await getDocs(collection(db, 'roles'))
      
      if (rolesSnapshot.empty) {
        console.log('🔧 Initializing default roles...')
        
        const batch = writeBatch(db)
        
        for (const roleData of DEFAULT_ROLES) {
          const roleRef = doc(collection(db, 'roles'))
          batch.set(roleRef, {
            ...roleData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: 'system'
          })
        }
        
        await batch.commit()
        console.log('✅ Default roles initialized')
      }
    } catch (error) {
      console.error('❌ Error initializing default roles:', error)
      throw error
    }
  }

  // User Management
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>, password: string): Promise<string> {
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password)
      const authUser = userCredential.user

      // Create user document
      const userDoc = {
        ...userData,
        id: authUser.uid,
        isEmailVerified: authUser.emailVerified,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      await updateDoc(doc(db, 'users', authUser.uid), userDoc)
      
      // Log activity
      await this.logUserActivity(authUser.uid, 'user.created', 'user', authUser.uid, {
        email: userData.email,
        role: userData.roleId
      })

      console.log('✅ User created:', authUser.uid)
      return authUser.uid
    } catch (error) {
      console.error('❌ Error creating user:', error)
      throw error
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      }

      await updateDoc(doc(db, 'users', userId), updateData)
      
      // Log activity
      await this.logUserActivity(userId, 'user.updated', 'user', userId, updates)
      
      console.log('✅ User updated:', userId)
    } catch (error) {
      console.error('❌ Error updating user:', error)
      throw error
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      // Soft delete - mark as inactive
      await updateDoc(doc(db, 'users', userId), {
        isActive: false,
        updatedAt: serverTimestamp()
      })
      
      // Log activity
      await this.logUserActivity(userId, 'user.deleted', 'user', userId, {})
      
      console.log('✅ User deleted (soft):', userId)
    } catch (error) {
      console.error('❌ Error deleting user:', error)
      throw error
    }
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (!userDoc.exists()) return null

      const userData = userDoc.data() as User
      
      // Get role information
      if (userData.roleId) {
        const role = await this.getRole(userData.roleId)
        userData.role = role || undefined
      }

      return userData
    } catch (error) {
      console.error('❌ Error getting user:', error)
      throw error
    }
  }

  async getUsers(options: {
    roleId?: string
    isActive?: boolean
    department?: string
    limit?: number
  } = {}): Promise<User[]> {
    try {
      let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))

      if (options.roleId) {
        q = query(q, where('roleId', '==', options.roleId))
      }

      if (options.isActive !== undefined) {
        q = query(q, where('isActive', '==', options.isActive))
      }

      if (options.department) {
        q = query(q, where('department', '==', options.department))
      }

      if (options.limit) {
        q = query(q, limit(options.limit))
      }

      const snapshot = await getDocs(q)
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[]

      // Get role information for each user
      for (const user of users) {
        if (user.roleId) {
          const role = await this.getRole(user.roleId)
          user.role = role || undefined
        }
      }

      return users
    } catch (error) {
      console.error('❌ Error getting users:', error)
      throw error
    }
  }

  // Role Management
  async createRole(roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const roleDoc = {
        ...roleData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'roles'), roleDoc)
      console.log('✅ Role created:', docRef.id)
      return docRef.id
    } catch (error) {
      console.error('❌ Error creating role:', error)
      throw error
    }
  }

  async updateRole(roleId: string, updates: Partial<Role>): Promise<void> {
    try {
      // Check if it's a system role
      const role = await this.getRole(roleId)
      if (role?.isSystemRole) {
        throw new Error('Cannot modify system role')
      }

      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      }

      await updateDoc(doc(db, 'roles', roleId), updateData)
      console.log('✅ Role updated:', roleId)
    } catch (error) {
      console.error('❌ Error updating role:', error)
      throw error
    }
  }

  async deleteRole(roleId: string): Promise<void> {
    try {
      // Check if it's a system role
      const role = await this.getRole(roleId)
      if (role?.isSystemRole) {
        throw new Error('Cannot delete system role')
      }

      // Check if any users have this role
      const usersWithRole = await getDocs(
        query(collection(db, 'users'), where('roleId', '==', roleId))
      )

      if (!usersWithRole.empty) {
        throw new Error('Cannot delete role that is assigned to users')
      }

      await deleteDoc(doc(db, 'roles', roleId))
      console.log('✅ Role deleted:', roleId)
    } catch (error) {
      console.error('❌ Error deleting role:', error)
      throw error
    }
  }

  async getRole(roleId: string): Promise<Role | null> {
    try {
      const roleDoc = await getDoc(doc(db, 'roles', roleId))
      if (!roleDoc.exists()) return null

      return { id: roleDoc.id, ...roleDoc.data() } as Role
    } catch (error) {
      console.error('❌ Error getting role:', error)
      throw error
    }
  }

  async getRoles(activeOnly: boolean = true): Promise<Role[]> {
    try {
      let q = query(collection(db, 'roles'), orderBy('name'))

      if (activeOnly) {
        q = query(q, where('isActive', '==', true))
      }

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Role[]
    } catch (error) {
      console.error('❌ Error getting roles:', error)
      throw error
    }
  }

  // Permission Management
  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const user = await this.getUser(userId)
      if (!user || !user.role) return []

      let permissions = [...user.role.permissions]

      // Add custom permissions
      if (user.customPermissions) {
        permissions = [...permissions, ...user.customPermissions]
      }

      // Remove denied permissions
      if (user.deniedPermissions) {
        permissions = permissions.filter(p => !user.deniedPermissions!.includes(p))
      }

      // Remove duplicates
      return [...new Set(permissions)]
    } catch (error) {
      console.error('❌ Error getting user permissions:', error)
      return []
    }
  }

  async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId)
      return permissions.includes(permission)
    } catch (error) {
      console.error('❌ Error checking permission:', error)
      return false
    }
  }

  async hasAnyPermission(userId: string, permissions: Permission[]): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId)
      return permissions.some(p => userPermissions.includes(p))
    } catch (error) {
      console.error('❌ Error checking permissions:', error)
      return false
    }
  }

  async hasAllPermissions(userId: string, permissions: Permission[]): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId)
      return permissions.every(p => userPermissions.includes(p))
    } catch (error) {
      console.error('❌ Error checking permissions:', error)
      return false
    }
  }

  // Session Management
  async createSession(userId: string, deviceInfo: UserSession['deviceInfo']): Promise<string> {
    try {
      const sessionData = {
        userId,
        deviceInfo,
        isActive: true,
        loginAt: serverTimestamp(),
        lastActivityAt: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'user_sessions'), sessionData)
      
      // Update user last login
      await updateDoc(doc(db, 'users', userId), {
        lastLoginAt: serverTimestamp()
      })

      console.log('✅ Session created:', docRef.id)
      return docRef.id
    } catch (error) {
      console.error('❌ Error creating session:', error)
      throw error
    }
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'user_sessions', sessionId), {
        lastActivityAt: serverTimestamp()
      })
    } catch (error) {
      console.error('❌ Error updating session activity:', error)
    }
  }

  async endSession(sessionId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'user_sessions', sessionId), {
        isActive: false,
        logoutAt: serverTimestamp()
      })
      console.log('✅ Session ended:', sessionId)
    } catch (error) {
      console.error('❌ Error ending session:', error)
      throw error
    }
  }

  async getUserSessions(userId: string, activeOnly: boolean = true): Promise<UserSession[]> {
    try {
      let q = query(
        collection(db, 'user_sessions'),
        where('userId', '==', userId),
        orderBy('loginAt', 'desc')
      )

      if (activeOnly) {
        q = query(q, where('isActive', '==', true))
      }

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserSession[]
    } catch (error) {
      console.error('❌ Error getting user sessions:', error)
      throw error
    }
  }

  // Activity Logging
  async logUserActivity(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details: Record<string, any> = {},
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const activityData = {
        userId,
        action,
        resource,
        resourceId,
        details,
        ip: ip || 'unknown',
        userAgent: userAgent || 'unknown',
        createdAt: serverTimestamp()
      }

      await addDoc(collection(db, 'user_activities'), activityData)
    } catch (error) {
      console.error('❌ Error logging user activity:', error)
      // Don't throw error for logging failures
    }
  }

  async getUserActivities(userId: string, limitCount: number = 50): Promise<UserActivity[]> {
    try {
      const q = query(
        collection(db, 'user_activities'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserActivity[]
    } catch (error) {
      console.error('❌ Error getting user activities:', error)
      throw error
    }
  }

  // User Invitations
  async inviteUser(email: string, roleId: string, invitedBy: string): Promise<string> {
    try {
      // Check if user already exists
      const existingUsers = await getDocs(
        query(collection(db, 'users'), where('email', '==', email))
      )

      if (!existingUsers.empty) {
        throw new Error('User with this email already exists')
      }

      // Generate invitation token
      const token = this.generateToken()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

      const invitationData = {
        email,
        roleId,
        invitedBy,
        token,
        expiresAt,
        isAccepted: false,
        createdAt: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'user_invitations'), invitationData)
      
      // TODO: Send invitation email
      console.log('✅ User invitation created:', docRef.id)
      return docRef.id
    } catch (error) {
      console.error('❌ Error inviting user:', error)
      throw error
    }
  }

  private generateToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  // Password Management
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email)
      console.log('✅ Password reset email sent to:', email)
    } catch (error) {
      console.error('❌ Error sending password reset email:', error)
      throw error
    }
  }

  // Real-time subscriptions
  subscribeToUsers(callback: (users: User[]) => void): () => void {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
    
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[]
      callback(users)
    })
  }

  subscribeToRoles(callback: (roles: Role[]) => void): () => void {
    const q = query(collection(db, 'roles'), orderBy('name'))
    
    return onSnapshot(q, (snapshot) => {
      const roles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Role[]
      callback(roles)
    })
  }
}

// Export singleton instance
export const userService = UserService.getInstance()

// Permission checking hooks for React components
export const usePermissions = (userId: string) => {
  const [permissions, setPermissions] = React.useState<Permission[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!userId) return

    const loadPermissions = async () => {
      try {
        const userPermissions = await userService.getUserPermissions(userId)
        setPermissions(userPermissions)
      } catch (error) {
        console.error('Error loading permissions:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPermissions()
  }, [userId])

  const hasPermission = (permission: Permission) => permissions.includes(permission)
  const hasAnyPermission = (perms: Permission[]) => perms.some(p => permissions.includes(p))
  const hasAllPermissions = (perms: Permission[]) => perms.every(p => permissions.includes(p))

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  }
}
