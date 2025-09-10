export interface UserData {
  email: string
  role: "admin" | "driver"
  createdAt: string
  pin?: string | null
  isActive?: boolean
}

export interface TimeEntry {
  id: string
  userId: string
  type: "punch-in" | "punch-out"
  timestamp: string
  location?: string
}

export interface ReturnForm {
  id: string
  userId: string
  orderNumber: string
  customerName: string
  organization: string
  reason: string
  date: string
  submittedAt: string
}

class LocalStorageDB {
  // User management
  getUserData(userId: string): UserData | null {
    const data = localStorage.getItem(`userData_${userId}`)
    return data ? JSON.parse(data) : null
  }

  setUserData(userId: string, userData: UserData): void {
    localStorage.setItem(`userData_${userId}`, JSON.stringify(userData))
  }

  // Time entries
  getTimeEntries(userId: string): TimeEntry[] {
    const entries = localStorage.getItem(`timeEntries_${userId}`)
    return entries ? JSON.parse(entries) : []
  }

  addTimeEntry(userId: string, entry: Omit<TimeEntry, "id">): TimeEntry {
    const entries = this.getTimeEntries(userId)
    const newEntry: TimeEntry = {
      ...entry,
      id: Date.now().toString(),
    }
    entries.push(newEntry)
    localStorage.setItem(`timeEntries_${userId}`, JSON.stringify(entries))
    return newEntry
  }

  // Return forms
  getReturnForms(userId?: string): ReturnForm[] {
    if (userId) {
      const forms = localStorage.getItem(`returnForms_${userId}`)
      return forms ? JSON.parse(forms) : []
    } else {
      // Get all return forms for admin view
      const allForms: ReturnForm[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith("returnForms_")) {
          const forms = localStorage.getItem(key)
          if (forms) {
            allForms.push(...JSON.parse(forms))
          }
        }
      }
      return allForms.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    }
  }

  addReturnForm(userId: string, form: Omit<ReturnForm, "id" | "userId" | "submittedAt">): ReturnForm {
    const forms = this.getReturnForms(userId)
    const newForm: ReturnForm = {
      ...form,
      id: Date.now().toString(),
      userId,
      submittedAt: new Date().toISOString(),
    }
    forms.push(newForm)
    localStorage.setItem(`returnForms_${userId}`, JSON.stringify(forms))
    return newForm
  }

  // Get all users for admin view
  getAllUsers(): UserData[] {
    const users: UserData[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith("userData_")) {
        const userData = localStorage.getItem(key)
        if (userData) {
          users.push(JSON.parse(userData))
        }
      }
    }
    return users
  }
}

export const localDB = new LocalStorageDB()
