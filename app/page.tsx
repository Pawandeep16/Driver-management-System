"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck, Shield, Users, Clock } from "lucide-react"

export default function HomePage() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && userRole) {
      if (userRole === "admin") {
        router.push("/admin/dashboard")
      } else if (userRole === "driver") {
        router.push("/driver/dashboard")
      }
    }
  }, [user, userRole, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Redirecting...</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Truck className="h-12 w-12 text-primary mr-4" />
            <h1 className="text-4xl font-bold text-foreground">Driver Management System</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional logistics management platform for administrators and drivers
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-6 w-6 text-primary mr-2" />
                Admin Portal
              </CardTitle>
              <CardDescription>Comprehensive management dashboard for administrators</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li>• Monitor all driver activities</li>
                <li>• Manage punch in/out systems</li>
                <li>• View return forms and reports</li>
                <li>• Control system settings</li>
              </ul>
              <Button onClick={() => router.push("/admin/login")} className="w-full">
                Admin Login
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-6 w-6 text-primary mr-2" />
                Driver Portal
              </CardTitle>
              <CardDescription>Easy-to-use interface for drivers</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li>• Punch in/out with PIN</li>
                <li>• Submit return forms</li>
                <li>• View work history</li>
                <li>• Manage profile settings</li>
              </ul>
              <Button onClick={() => router.push("/driver/login")} className="w-full" variant="secondary">
                Driver Login
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="text-center">
            <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="font-semibold mb-1">Real-time Tracking</h3>
            <p className="text-sm text-muted-foreground">Monitor driver activities in real-time</p>
          </div>
          <div className="text-center">
            <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="font-semibold mb-1">Secure Access</h3>
            <p className="text-sm text-muted-foreground">Role-based authentication system</p>
          </div>
          <div className="text-center">
            <Truck className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="font-semibold mb-1">Efficient Management</h3>
            <p className="text-sm text-muted-foreground">Streamlined logistics operations</p>
          </div>
        </div>
      </div>
    </div>
  )
}
