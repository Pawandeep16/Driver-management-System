import { type NextRequest, NextResponse } from "next/server"
import net from "net"

interface ReturnFormData {
  formId: string
  driverId: string
  driverEmail: string
  orderNo: string
  customerName: string
  organization: string
  reason: string
  date: Date
  createdAt: Date
  status: string
}

// Helper: generate print content
function generatePrintContent(formData: ReturnFormData): string {
  const currentDate = new Date().toLocaleString()
  const returnDate = new Date(formData.date).toLocaleDateString()
  return `
=====================================
        RETURN FORM
=====================================
Form ID: ${formData.formId}
Submitted: ${currentDate}
-------------------------------------
ORDER DETAILS
-------------------------------------
Order Number: ${formData.orderNo}
Return Date: ${returnDate}
-------------------------------------
CUSTOMER INFORMATION
-------------------------------------
Customer Name: ${formData.customerName}
Organization: ${formData.organization}
-------------------------------------
RETURN DETAILS
-------------------------------------
Reason for Return:
${formData.reason}
-------------------------------------
DRIVER INFORMATION
-------------------------------------
Driver: ${formData.driverEmail}
Driver ID: ${formData.driverId}
-------------------------------------
STATUS: ${formData.status.toUpperCase()}
=====================================
`
}

// Auto discover Zebra printer on local network (port 9100)
async function findPrinterOnNetwork(subnet = "192.168.1"): Promise<string | null> {
  for (let i = 2; i < 255; i++) {
    const ip = `${subnet}.${i}`
    const isAlive = await new Promise<boolean>((resolve) => {
      const socket = new net.Socket()
      socket.setTimeout(200)
      socket.on("connect", () => {
        socket.destroy()
        resolve(true)
      })
      socket.on("timeout", () => {
        socket.destroy()
        resolve(false)
      })
      socket.on("error", () => {
        resolve(false)
      })
      socket.connect(9100, ip)
    })
    if (isAlive) return ip
  }
  return null
}

// Send raw data to printer
async function sendToPrinter(ip: string, data: string) {
  return new Promise<void>((resolve, reject) => {
    const client = new net.Socket()
    client.connect(9100, ip, () => {
      client.write(data)
      client.end()
      resolve()
    })
    client.on("error", (err) => reject(err))
  })
}

export async function POST(request: NextRequest) {
  try {
    const formData: ReturnFormData = await request.json()
    const printContent = generatePrintContent(formData)

    // Discover printer automatically
    const printerIP = await findPrinterOnNetwork()
    if (!printerIP) {
      return NextResponse.json({ success: false, message: "No printer found on network" })
    }

    // Send print job
    await sendToPrinter(printerIP, printContent)

    console.log("Print job sent to printer:", printerIP)
    return NextResponse.json({
      success: true,
      message: "Return form sent to printer successfully",
      formId: formData.formId,
      printerIP,
    })
  } catch (error) {
    console.error("Print error:", error)
    return NextResponse.json({ success: false, message: "Failed to print return form" }, { status: 500 })
  }
}
