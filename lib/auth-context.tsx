"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth"
import { auth, db } from "./firebase"
import { doc, setDoc, getDoc } from "firebase/firestore"

interface AuthContextType {
  user: User | null
  userRole: "admin" | "driver" | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, role: "admin" | "driver", adminPassword?: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<"admin" | "driver" | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        // fetch role from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserRole(data.role)
          localStorage.setItem(`userRole_${firebaseUser.uid}`, data.role)
        } else {
          // fallback: default driver
          setUserRole("driver")
          localStorage.setItem(`userRole_${firebaseUser.uid}`, "driver")
        }
      } else {
        setUser(null)
        setUserRole(null)
      }
      setLoading(false)
    })
 return () => unsubscribe(); 
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      setUser(result.user)
      const userDoc = await getDoc(doc(db, "users", result.user.uid))
      if (userDoc.exists()) {
        const data = userDoc.data()
        setUserRole(data.role)
        localStorage.setItem(`userRole_${result.user.uid}`, data.role)
      }
    } catch (error: any) {
      console.error("Sign in error:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, role: "admin" | "driver", adminPassword?: string) => {
    if (role === "admin" && adminPassword !== "ADMIN_SECRET_2024") {
      throw new Error("Invalid admin password")
    }

    setLoading(true)
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      setUser(user)
      setUserRole(role)
      localStorage.setItem(`userRole_${user.uid}`, role)

      // create user document in Firestore
      const userData: any = {
        email: user.email,
        role,
        createdAt: new Date().toISOString(),
      }

      if (role === "driver") {
        userData.pin = null
        userData.isActive = true
      }

      await setDoc(doc(db, "users", user.uid), userData)
    } catch (error: any) {
      console.error("Sign up error:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const { user } = await signInWithPopup(auth, provider)
      setUser(user)

      // fetch role from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid))
      let role: "admin" | "driver" = "driver"

      if (userDoc.exists()) {
        role = userDoc.data().role
      } else {
        // create new driver by default
        const userData = {
          email: user.email,
          role: "driver",
          createdAt: new Date().toISOString(),
          pin: null,
          isActive: true,
        }
        await setDoc(doc(db, "users", user.uid), userData)
      }

      setUserRole(role)
      localStorage.setItem(`userRole_${user.uid}`, role)
    } catch (error: any) {
      console.error("Google sign in error:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      await signOut(auth)
      setUser(null)
      setUserRole(null)
      localStorage.removeItem("fallbackAuth")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    userRole,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
