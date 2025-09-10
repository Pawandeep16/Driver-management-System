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
import { Clock, ArrowLeft, Key } from "lucide-react"
import { doc, getDoc, setDoc, addDoc, collection } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Link from "next/link"

export default function PunchInPage() {
  const { user, userRole } = useAuth()
  const router = useRouter()
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [hasPin, setHasPin] = useState(false)
  const [checkingPin, setCheckingPin] = useState(true)

  useEffect(() => {
    if (userRole !== "driver" || !user) {
      router.push("/driver/login")
      return
    }

    const checkDriverPin = async () => {
      try {
        try {
          const driverDoc = await getDoc(doc(db, "users", user.uid))
          if (driverDoc.exists()) {
            const driverData = driverDoc.data()
            setHasPin(!!driverData.pin)
          }
        } catch (firestoreError) {
          console.log("[v0] Firestore access denied, using localStorage fallback")
          // Fallback to localStorage
          const localData = localStorage.getItem(`driver_${user.uid}`)
          if (localData) {
            const driverData = JSON.parse(localData)
            setHasPin(!!driverData.pin)
          }
        }
      } catch (error) {
        console.error("Error checking PIN:", error)
      } finally {
        setCheckingPin(false)
      }
    }

    checkDriverPin()
  }, [user, userRole, router])

  const handlePunchIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setError("")
    setLoading(true)

    try {
      let driverData: any = null

      try {
        const driverDoc = await getDoc(doc(db, "users", user.uid))
        if (driverDoc.exists()) {
          driverData = driverDoc.data()
        }
      } catch (firestoreError) {
        console.log("[v0] Firestore access denied, using localStorage fallback")
        // Fallback to localStorage
        const localData = localStorage.getItem(`driver_${user.uid}`)
        if (localData) {
          driverData = JSON.parse(localData)
        }
      }

      if (!driverData) {
        setError("Driver not found. Please set up your PIN first.")
        return
      }

      if (driverData.pin !== pin) {
        setError("Invalid PIN")
        return
      }

      // Record punch in
      const punchInTime = new Date()
      const updatedDriverData = {
        ...driverData,
        lastPunchIn: punchInTime.toISOString(),
        lastPunchOut: null,
        updatedAt: punchInTime.toISOString(),
      }

      try {
        await setDoc(
          doc(db, "users", user.uid),
          {
            lastPunchIn: punchInTime,
            lastPunchOut: null,
            updatedAt: punchInTime,
          },
          { merge: true },
        )

        // Add to punch records
        await addDoc(collection(db, "punchRecords"), {
          driverId: user.uid,
          driverEmail: user.email,
          type: "punch-in",
          timestamp: punchInTime,
          createdAt: punchInTime,
        })
      } catch (firestoreError) {
        console.log("[v0] Firestore write failed, saving to localStorage")
        // Save to localStorage as fallback
        localStorage.setItem(`driver_${user.uid}`, JSON.stringify(updatedDriverData))

        // Save punch record to localStorage
        const punchRecords = JSON.parse(localStorage.getItem("punchRecords") || "[]")
        punchRecords.push({
          id: Date.now().toString(),
          driverId: user.uid,
          driverEmail: user.email,
          type: "punch-in",
          timestamp: punchInTime.toISOString(),
          createdAt: punchInTime.toISOString(),
        })
        localStorage.setItem("punchRecords", JSON.stringify(punchRecords))
      }

      router.push("/driver/dashboard")
    } catch (error: any) {
      setError(error.message || "Failed to punch in")
    } finally {
      setLoading(false)
    }
  }

  if (checkingPin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!hasPin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Key className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">PIN Required</CardTitle>
            <CardDescription>You need to set up a PIN before you can punch in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                For security, you need to set up a personal PIN code to punch in. This PIN will be required every time
                you start work.
              </AlertDescription>
            </Alert>
            <Button onClick={() => router.push("/driver/settings")} className="w-full">
              Set Up PIN
            </Button>
            <Button variant="outline" onClick={() => router.push("/driver/dashboard")} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Punch In</CardTitle>
          <CardDescription>Enter your PIN to start your work shift</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePunchIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">Enter Your PIN</Label>
              <Input
                id="pin"
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
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

            <div className="space-y-2">
              <Button type="submit" className="w-full" disabled={loading || pin.length !== 4}>
                {loading ? "Punching In..." : "Punch In"}
              </Button>
              <Button variant="outline" onClick={() => router.push("/driver/dashboard")} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Forgot your PIN?{" "}
              <Link href="/driver/settings" className="text-primary hover:underline">
                Reset PIN
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
