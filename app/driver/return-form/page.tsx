"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, ArrowLeft, Send, Printer } from "lucide-react"
import { addDoc, collection } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function ReturnFormPage() {
  const { user, userRole } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    orderNo: "",
    customerName: "",
    organization: "",
    reason: "",
    date: new Date().toISOString().split("T")[0], // Today's date as default
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [printing, setPrinting] = useState(false)

  if (userRole !== "driver") {
    router.push("/driver/login")
    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setError("")
    setSuccess("")
    setLoading(true)

    try {
      // Validate form data
      if (!formData.orderNo.trim()) {
        setError("Order number is required")
        return
      }
      if (!formData.customerName.trim()) {
        setError("Customer name is required")
        return
      }
      if (!formData.organization.trim()) {
        setError("Organization is required")
        return
      }
      if (!formData.reason.trim()) {
        setError("Return reason is required")
        return
      }

      // Submit to Firebase
      const returnFormData = {
        driverId: user.uid,
        driverEmail: user.email,
        orderNo: formData.orderNo.trim(),
        customerName: formData.customerName.trim(),
        organization: formData.organization.trim(),
        reason: formData.reason.trim(),
        date: new Date(formData.date),
        createdAt: new Date(),
        status: "submitted",
      }

      const docRef = await addDoc(collection(db, "returnForms"), returnFormData)

      setSuccess("Return form submitted successfully!")

      // Trigger printing
      setPrinting(true)
      try {
        const printResponse = await fetch("/api/print-return", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...returnFormData,
            formId: docRef.id,
          }),
        })

        if (printResponse.ok) {
          setSuccess("Return form submitted and sent to printer!")
        } else {
          setSuccess("Return form submitted, but printing failed. Please contact admin.")
        }
      } catch (printError) {
        console.error("Print error:", printError)
        setSuccess("Return form submitted, but printing failed. Please contact admin.")
      } finally {
        setPrinting(false)
      }

      // Reset form
      setFormData({
        orderNo: "",
        customerName: "",
        organization: "",
        reason: "",
        date: new Date().toISOString().split("T")[0],
      })

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push("/driver/dashboard")
      }, 3000)
    } catch (error: any) {
      setError(error.message || "Failed to submit return form")
    } finally {
      setLoading(false)
    }
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
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Return Form</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Submit Return Request</CardTitle>
            <CardDescription>
              Fill out the details for the item return. The form will be automatically printed after submission.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderNo">Order Number *</Label>
                  <Input
                    id="orderNo"
                    name="orderNo"
                    type="text"
                    placeholder="e.g., ORD-12345"
                    value={formData.orderNo}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Return Date *</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  name="customerName"
                  type="text"
                  placeholder="Enter customer's full name"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">Organization *</Label>
                <Input
                  id="organization"
                  name="organization"
                  type="text"
                  placeholder="Enter organization/company name"
                  value={formData.organization}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Return *</Label>
                <Textarea
                  id="reason"
                  name="reason"
                  placeholder="Describe the reason for return (e.g., damaged item, wrong size, defective product)"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows={4}
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
                  <Printer className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-4">
                <Button type="submit" className="flex-1" disabled={loading || printing}>
                  {loading ? (
                    "Submitting..."
                  ) : printing ? (
                    <>
                      <Printer className="h-4 w-4 mr-2" />
                      Printing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit & Print
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/driver/dashboard")}
                  disabled={loading || printing}
                >
                  Cancel
                </Button>
              </div>
            </form>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Important Notes:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• All fields marked with * are required</li>
                <li>• The return form will be automatically printed after submission</li>
                <li>• Make sure the printer is connected and has paper</li>
                <li>• You will be redirected to the dashboard after successful submission</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
