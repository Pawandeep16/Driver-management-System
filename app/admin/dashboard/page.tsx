"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Users, FileText, LogOut, Activity, TrendingUp, AlertCircle, CheckCircle, Printer } from "lucide-react"
import { collection, query, onSnapshot, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminRouteGuard } from "@/components/admin-route-guard"

interface Driver {
  id: string
  email: string
  isActive: boolean
  pin?: string
  lastPunchIn?: any
  lastPunchOut?: any
}

interface ReturnForm {
  id: string
  driverId: string
  driverEmail: string
  orderNo: string
  customerName: string
  organization: string
  reason: string
  date: any
  createdAt: any
  status: string
}

interface PunchRecord {
  id: string
  driverId: string
  driverEmail: string
  type: "punch-in" | "punch-out"
  timestamp: any
  createdAt: any
}

export default function AdminDashboard() {
  const { user, userRole, logout } = useAuth()
  const router = useRouter()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [returnForms, setReturnForms] = useState<ReturnForm[]>([])
  const [punchRecords, setPunchRecords] = useState<PunchRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkFirebaseAccess = async () => {
      try {
        const testQuery = query(collection(db, "users"), where("role", "==", "test"))
        await new Promise((resolve, reject) => {
          const unsubscribe = onSnapshot(testQuery, resolve, reject)
          setTimeout(() => {
            unsubscribe()
            reject(new Error("Timeout"))
          }, 1000)
        })
        return true
      } catch (error) {
        return false
      }
    }

    const loadData = async () => {
      const hasFirebaseAccess = await checkFirebaseAccess()

      if (hasFirebaseAccess) {
        const driversQuery = query(collection(db, "users"), where("role", "==", "driver"), orderBy("createdAt", "desc"))
        const returnsQuery = query(collection(db, "returnForms"), orderBy("createdAt", "desc"))
        const punchQuery = query(collection(db, "punchRecords"), orderBy("createdAt", "desc"))

        const unsubscribeDrivers = onSnapshot(driversQuery, (snapshot) => {
          const driversData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Driver[]
          setDrivers(driversData)
        })

        const unsubscribeReturns = onSnapshot(returnsQuery, (snapshot) => {
          const returnsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as ReturnForm[]
          setReturnForms(returnsData)
        })

        const unsubscribePunch = onSnapshot(punchQuery, (snapshot) => {
          const punchData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as PunchRecord[]
          setPunchRecords(punchData)
          setLoading(false)
        })

        return () => {
          unsubscribeDrivers()
          unsubscribeReturns()
          unsubscribePunch()
        }
      } else {
        console.log("[v0] Firebase not accessible, using localStorage")

        const localDrivers: Driver[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith("userData_")) {
            try {
              const userData = JSON.parse(localStorage.getItem(key) || "{}")
              if (userData.role === "driver") {
                localDrivers.push({
                  id: key.replace("userData_", ""),
                  email: userData.email,
                  isActive: userData.isActive || true,
                  pin: userData.pin,
                  lastPunchIn: userData.lastPunchIn,
                  lastPunchOut: userData.lastPunchOut,
                })
              }
            } catch (e) {
              console.log(`[v0] Error parsing user data for key ${key}`)
            }
          }
        }

        const fallbackUsers = JSON.parse(localStorage.getItem("fallbackUsers") || "[]")
        fallbackUsers.forEach((fallbackUser: any) => {
          if (fallbackUser.role === "driver") {
            const exists = localDrivers.some((d) => d.email === fallbackUser.email)
            if (!exists) {
              localDrivers.push({
                id: `fallback_${fallbackUser.email}`,
                email: fallbackUser.email,
                isActive: true,
                
                lastPunchIn: null,
                lastPunchOut: null,
              })
            }
          }
        })

        setDrivers(localDrivers)

        const localReturns = JSON.parse(localStorage.getItem("returnForms") || "[]")
        setReturnForms(localReturns)

        const localPunchRecords = JSON.parse(localStorage.getItem("punchRecords") || "[]")
        setPunchRecords(localPunchRecords)

        setLoading(false)
        return () => {}
      }
    }

    const cleanup = loadData()
    return () => {
      cleanup.then((cleanupFn) => cleanupFn && cleanupFn())
    }
  }, [router])

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  const handleReprintForm = async (formId: string, formData: ReturnForm) => {
    try {
      const response = await fetch("/api/print-return", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          formId,
        }),
      })

      if (response.ok) {
        alert("Return form sent to printer successfully!")
      } else {
        alert("Failed to print return form. Please check printer connection.")
      }
    } catch (error) {
      console.error("Reprint error:", error)
      alert("Failed to print return form. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  const activeDrivers = drivers.filter((d) => d.isActive)
  const punchedInDrivers = drivers.filter((d) => d.lastPunchIn && !d.lastPunchOut)
  const todayReturns = returnForms.filter((form) => {
    const today = new Date()
    const formDate = form.createdAt?.toDate()
    return formDate?.toDateString() === today.toDateString()
  })

  return (
    <AdminRouteGuard>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Driver Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">{user?.email}</Badge>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{drivers.length}</div>
                <p className="text-xs text-muted-foreground">{activeDrivers.length} active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Currently Working</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{punchedInDrivers.length}</div>
                <p className="text-xs text-muted-foreground">Punched in drivers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Return Forms</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{returnForms.length}</div>
                <p className="text-xs text-muted-foreground">Total submissions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Returns</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayReturns.length}</div>
                <p className="text-xs text-muted-foreground">Forms submitted today</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="drivers" className="space-y-6">
            <TabsList>
              <TabsTrigger value="drivers">Drivers</TabsTrigger>
              <TabsTrigger value="returns">Return Forms</TabsTrigger>
              <TabsTrigger value="activity">Punch Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="drivers">
              <Card>
                <CardHeader>
                  <CardTitle>Driver Management</CardTitle>
                  <CardDescription>Monitor and manage all registered drivers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {drivers.map((driver) => (
                      <div key={driver.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {driver.isActive ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            )}
                            <span className="font-medium">{driver.email}</span>
                          </div>
                          <Badge variant={driver.isActive ? "default" : "secondary"}>
                            {driver.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {driver.pin && <Badge variant="outline">PIN Set</Badge>}
                        </div>
                        <div className="flex items-center space-x-2">
                          {driver.lastPunchIn && !driver.lastPunchOut && <Badge variant="destructive">Working</Badge>}
                          <Button variant="outline" size="sm">
                            Manage
                          </Button>
                        </div>
                      </div>
                    ))}
                    {drivers.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No drivers registered yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="returns">
              <Card>
                <CardHeader>
                  <CardTitle>Return Forms</CardTitle>
                  <CardDescription>View all submitted return forms with reprint option</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {returnForms.map((form) => (
                      <div key={form.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="font-medium">Order #{form.orderNo}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{form.createdAt?.toDate().toLocaleDateString()}</Badge>
                            <Button variant="outline" size="sm" onClick={() => handleReprintForm(form.id, form)}>
                              <Printer className="h-4 w-4 mr-1" />
                              Reprint
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Driver:</span> {form.driverEmail}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Customer:</span> {form.customerName}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Organization:</span> {form.organization}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant="secondary" className="ml-2">
                              {form.status}
                            </Badge>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Reason:</span> {form.reason}
                          </div>
                        </div>
                      </div>
                    ))}
                    {returnForms.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No return forms submitted yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Punch Activity</CardTitle>
                  <CardDescription>Recent punch in/out activity from all drivers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {punchRecords.slice(0, 20).map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Activity
                            className={`h-5 w-5 ${record.type === "punch-in" ? "text-green-500" : "text-red-500"}`}
                          />
                          <div>
                            <p className="font-medium">{record.driverEmail}</p>
                            <p className="text-sm text-muted-foreground">
                              {record.type === "punch-in" ? "Punched In" : "Punched Out"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{record.timestamp?.toDate().toLocaleString()}</p>
                          <Badge variant={record.type === "punch-in" ? "default" : "secondary"}>{record.type}</Badge>
                        </div>
                      </div>
                    ))}
                    {punchRecords.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No punch activity recorded yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminRouteGuard>
  )
}
