"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Key, User, ArrowLeft, Save } from "lucide-react"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface DriverData {
  email: string
  role: string
  pin?: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export default function DriverSettingsPage() {
  const { user, userRole } = useAuth()
  const router = useRouter()
  const [driverData, setDriverData] = useState<DriverData | null>(null)
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [currentPin, setCurrentPin] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (userRole !== "driver" || !user) {
      router.push("/driver/login")
      return
    }

    const fetchDriverData = async () => {
      try {
        const driverDoc = await getDoc(doc(db, "users", user.uid))
        if (driverDoc.exists()) {
          setDriverData(driverDoc.data() as DriverData)
        }
      } catch (error) {
        console.error("Error fetching driver data:", error)
      } finally {
        setDataLoading(false)
      }
    }

    fetchDriverData()
  }, [user, userRole, router])

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setError("")
    setSuccess("")

    if (newPin.length !== 4) {
      setError("PIN must be exactly 4 digits")
      return
    }

    if (newPin !== confirmPin) {
      setError("PINs do not match")
      return
    }

    if (!/^\d{4}$/.test(newPin)) {
      setError("PIN must contain only numbers")
      return
    }

    setLoading(true)

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          email: user.email,
          role: "driver",
          pin: newPin,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true },
      )

      setDriverData((prev) => prev && { ...prev, pin: newPin })
      setNewPin("")
      setConfirmPin("")
      setSuccess("PIN set successfully!")
    } catch (error: any) {
      console.error("Error setting PIN:", error)
      setError(error.message || "Failed to set PIN")
    } finally {
      setLoading(false)
    }
  }

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !driverData) return

    setError("")
    setSuccess("")

    if (currentPin !== driverData.pin) {
      setError("Current PIN is incorrect")
      return
    }

    if (newPin.length !== 4) {
      setError("New PIN must be exactly 4 digits")
      return
    }

    if (newPin !== confirmPin) {
      setError("New PINs do not match")
      return
    }

    if (!/^\d{4}$/.test(newPin)) {
      setError("PIN must contain only numbers")
      return
    }

    setLoading(true)

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          pin: newPin,
          updatedAt: new Date(),
        },
        { merge: true },
      )

      setDriverData((prev) => prev && { ...prev, pin: newPin })
      setCurrentPin("")
      setNewPin("")
      setConfirmPin("")
      setSuccess("PIN changed successfully!")
    } catch (error: any) {
      console.error("Error changing PIN:", error)
      setError(error.message || "Failed to change PIN")
    } finally {
      setLoading(false)
    }
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.push("/driver/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-2">
              <Settings className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Settings</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Tabs defaultValue="pin" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pin">PIN Management</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="pin">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="h-5 w-5 text-primary mr-2" />
                  PIN Management
                </CardTitle>
                <CardDescription>
                  {driverData?.pin ? "Change your existing PIN" : "Set up your PIN for punch in"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!driverData?.pin ? (
                  // Set PIN for first time
                  <form onSubmit={handleSetPin} className="space-y-4">
                    <Alert>
                      <Key className="h-4 w-4" />
                      <AlertDescription>
                        Your PIN will be required every time you punch in. Choose a 4-digit number you can easily
                        remember.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="newPin">New PIN (4 digits)</Label>
                      <Input
                        id="newPin"
                        type="password"
                        placeholder="••••"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        maxLength={4}
                        className="text-center text-2xl tracking-widest"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPin">Confirm PIN</Label>
                      <Input
                        id="confirmPin"
                        type="password"
                        placeholder="••••"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        maxLength={4}
                        className="text-center text-2xl tracking-widest"
                        required
                      />
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert>
                        <AlertDescription>{success}</AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? "Setting PIN..." : "Set PIN"}
                    </Button>
                  </form>
                ) : (
                  // Change existing PIN
                  <form onSubmit={handleChangePin} className="space-y-4">
                    <Alert>
                      <Key className="h-4 w-4" />
                      <AlertDescription>
                        You currently have a PIN set up. Enter your current PIN to change it.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="currentPin">Current PIN</Label>
                      <Input
                        id="currentPin"
                        type="password"
                        placeholder="••••"
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value)}
                        maxLength={4}
                        className="text-center text-2xl tracking-widest"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPin">New PIN (4 digits)</Label>
                      <Input
                        id="newPin"
                        type="password"
                        placeholder="••••"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        maxLength={4}
                        className="text-center text-2xl tracking-widest"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPin">Confirm New PIN</Label>
                      <Input
                        id="confirmPin"
                        type="password"
                        placeholder="••••"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        maxLength={4}
                        className="text-center text-2xl tracking-widest"
                        required
                      />
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert>
                        <AlertDescription>{success}</AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? "Changing PIN..." : "Change PIN"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 text-primary mr-2" />
                  Profile Information
                </CardTitle>
                <CardDescription>Your account details and status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{driverData?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Account Type</p>
                      <p className="text-sm text-muted-foreground">Driver</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Status</p>
                      <p className="text-sm text-muted-foreground">{driverData?.isActive ? "Active" : "Inactive"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">PIN Status</p>
                      <p className="text-sm text-muted-foreground">{driverData?.pin ? "PIN is set" : "No PIN set"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
