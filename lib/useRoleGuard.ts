"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export function useRoleGuard(requiredRole: "admin" | "driver") {
  const { userRole, loading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If still loading, do nothing
    if (loading) return

    // If user is not logged in, redirect to login
    if (!user) {
      router.push(requiredRole === "admin" ? "/admin/login" : "/driver/login")
      return
    }

    // If user is logged in but role mismatch
    if (userRole !== requiredRole) {
      router.push(requiredRole === "admin" ? "/admin/login" : "/driver/login")
    }
  }, [userRole, loading, user, requiredRole, router])
}
