"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, LogOut, Clock, FileText, Settings, User, Activity } from "lucide-react";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ---------- Types ----------
type AnyDate = Date | { toDate?: () => Date; seconds?: number; nanoseconds?: number } | string | null | undefined;

interface DriverData {
  email: string;
  role: string;
  pin?: string;
  isActive: boolean;
  lastPunchIn?: AnyDate;
  lastPunchOut?: AnyDate;
  updatedAt?: AnyDate;
}

interface ReturnForm {
  id: string;
  orderNo: string;
  customerName: string;
  organization: string;
  reason: string;
  date?: AnyDate;
  createdAt?: AnyDate;
  driverId?: string;
}

// ---------- Date helpers (handle Timestamp | Date | string) ----------
function toJsDate(value: AnyDate): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  // Firestore Timestamp duck-typing
  if (typeof (value as any).toDate === "function") {
    try {
      return (value as any).toDate();
    } catch {
      // fall through
    }
  }
  if (typeof (value as any).seconds === "number") {
    return new Date((value as any).seconds * 1000);
  }
  return null;
}

function formatDateTime(value: AnyDate): string {
  const d = toJsDate(value);
  return d ? d.toLocaleString() : "—";
}

function formatDateOnly(value: AnyDate): string {
  const d = toJsDate(value);
  return d ? d.toLocaleDateString() : "—";
}

// ---------- Component ----------
export default function DriverDashboard() {
  const { user, userRole, logout } = useAuth();
  const router = useRouter();

  const [driverData, setDriverData] = useState<DriverData | null>(null);
  const [returnForms, setReturnForms] = useState<ReturnForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [punchOutLoading, setPunchOutLoading] = useState(false);

  useEffect(() => {
    // Only drivers are allowed here
    if (userRole !== "driver") {
      router.push("/driver/login");
      return;
    }
    if (!user) return;

    const fetchDriverData = async () => {
      try {
        const driverDoc = await getDoc(doc(db, "users", user.uid));
        if (driverDoc.exists()) {
          const data = driverDoc.data() as DriverData;
          setDriverData(data);

          const inAt = toJsDate(data.lastPunchIn);
          const outAt = toJsDate(data.lastPunchOut);
          setIsPunchedIn(Boolean(inAt) && !Boolean(outAt));
        } else {
          // No Firestore doc; create a local default
          const defaultData: DriverData = {
            email: user.email || "",
            role: "driver",
            isActive: true,
          };
          setDriverData(defaultData);
          localStorage.setItem(`driver_${user.uid}`, JSON.stringify(defaultData));
          setIsPunchedIn(false);
        }
      } catch {
        // Firestore denied, fallback to localStorage
        const localData = localStorage.getItem(`driver_${user.uid}`);
        if (localData) {
          const data = JSON.parse(localData) as DriverData;
          setDriverData(data);
          const inAt = toJsDate(data.lastPunchIn);
          const outAt = toJsDate(data.lastPunchOut);
          setIsPunchedIn(Boolean(inAt) && !Boolean(outAt));
        } else {
          const defaultData: DriverData = {
            email: user.email || "",
            role: "driver",
            isActive: true,
          };
          setDriverData(defaultData);
          localStorage.setItem(`driver_${user.uid}`, JSON.stringify(defaultData));
          setIsPunchedIn(false);
        }
      }
    };

    fetchDriverData();

    // Live returns feed
    try {
      const returnsQuery = query(
        collection(db, "returnForms"),
        where("driverId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const unsubscribeReturns = onSnapshot(
        returnsQuery,
        (snapshot) => {
          const returnsData = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as ReturnForm[];
          setReturnForms(returnsData);
          setLoading(false);
        },
        () => {
          // Fallback to localStorage if listener fails
          const localReturns = JSON.parse(localStorage.getItem("returnForms") || "[]");
          const driverReturns = (localReturns as ReturnForm[]).filter((form: any) => form.driverId === user.uid);
          setReturnForms(driverReturns);
          setLoading(false);
        }
      );

      return () => {
        unsubscribeReturns();
      };
    } catch {
      const localReturns = JSON.parse(localStorage.getItem("returnForms") || "[]");
      const driverReturns = (localReturns as ReturnForm[]).filter((form: any) => form.driverId === user.uid);
      setReturnForms(driverReturns);
      setLoading(false);
    }
  }, [user, userRole, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const handlePunchIn = () => {
    router.push("/driver/punch-in");
  };

  const handlePunchOut = async () => {
    if (!user) return;

    setPunchOutLoading(true);
    try {
      const punchOutTime = new Date();

      try {
        // Persist to Firestore
        await setDoc(
          doc(db, "users", user.uid),
          {
            lastPunchOut: punchOutTime, // Firestore will store as Timestamp
            updatedAt: punchOutTime,
          },
          { merge: true }
        );

        await addDoc(collection(db, "punchRecords"), {
          driverId: user.uid,
          driverEmail: user.email,
          type: "punch-out",
          timestamp: punchOutTime,
          createdAt: punchOutTime,
        });
      } catch {
        // Firestore failed → local fallback
        const localKey = `driver_${user.uid}`;
        const localDataRaw = localStorage.getItem(localKey);
        const localData: DriverData = localDataRaw ? JSON.parse(localDataRaw) : { email: user.email || "", role: "driver", isActive: true };
        localData.lastPunchOut = punchOutTime.toISOString();
        localData.updatedAt = punchOutTime.toISOString();
        localStorage.setItem(localKey, JSON.stringify(localData));

        const punchRecords = JSON.parse(localStorage.getItem("punchRecords") || "[]");
        punchRecords.push({
          id: Date.now().toString(),
          driverId: user.uid,
          driverEmail: user.email,
          type: "punch-out",
          timestamp: punchOutTime.toISOString(),
          createdAt: punchOutTime.toISOString(),
        });
        localStorage.setItem("punchRecords", JSON.stringify(punchRecords));
      }

      // Update UI immediately with a JS Date (our formatter can handle it)
      setIsPunchedIn(false);
      setDriverData((prev) => (prev ? { ...prev, lastPunchOut: punchOutTime, updatedAt: punchOutTime } : prev));
    } catch (error) {
      console.error("Error punching out:", error);
    } finally {
      setPunchOutLoading(false);
    }
  };

  const handleReturnForm = () => {
    router.push("/driver/return-form");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Truck className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Driver Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {user?.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant={isPunchedIn ? "destructive" : "secondary"}>
              {isPunchedIn ? "Working" : "Off Duty"}
            </Badge>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 text-primary mr-2" />
                Time Tracking
              </CardTitle>
              <CardDescription>Manage your work hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {!isPunchedIn ? (
                  <Button onClick={handlePunchIn} className="w-full">
                    Punch In
                  </Button>
                ) : (
                  <Button onClick={handlePunchOut} variant="destructive" className="w-full" disabled={punchOutLoading}>
                    {punchOutLoading ? "Punching Out..." : "Punch Out"}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground text-center">
                  {isPunchedIn ? "You are currently working" : "Ready to start work"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 text-primary mr-2" />
                Return Form
              </CardTitle>
              <CardDescription>Submit return requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button onClick={handleReturnForm} variant="secondary" className="w-full">
                  New Return Form
                </Button>
                <p className="text-xs text-muted-foreground text-center">Submit items for return processing</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 text-primary mr-2" />
                Profile Settings
              </CardTitle>
              <CardDescription>Manage your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button onClick={() => router.push("/driver/settings")} variant="outline" className="w-full">
                  Manage Profile
                </Button>
                <p className="text-xs text-muted-foreground text-center">Update PIN and preferences</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="returns">My Returns</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your recent work activities and submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {driverData?.lastPunchIn && (
                    <div className="flex items-center space-x-4 p-3 border rounded-lg">
                      <Activity className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Last Punch In</p>
                        <p className="text-sm text-muted-foreground">{formatDateTime(driverData.lastPunchIn)}</p>
                      </div>
                    </div>
                  )}
                  {driverData?.lastPunchOut && (
                    <div className="flex items-center space-x-4 p-3 border rounded-lg">
                      <Activity className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-medium">Last Punch Out</p>
                        <p className="text-sm text-muted-foreground">{formatDateTime(driverData.lastPunchOut)}</p>
                      </div>
                    </div>
                  )}
                  {returnForms.slice(0, 3).map((form) => (
                    <div key={form.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Return Form #{form.orderNo}</p>
                        <p className="text-sm text-muted-foreground">{formatDateTime(form.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                  {!driverData?.lastPunchIn && returnForms.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="returns">
            <Card>
              <CardHeader>
                <CardTitle>My Return Forms</CardTitle>
                <CardDescription>All your submitted return forms</CardDescription>
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
                        <Badge variant="outline">{formatDateOnly(form.createdAt)}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Customer:</span> {form.customerName}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Organization:</span> {form.organization}
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

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Your account details and settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 p-4 border rounded-lg">
                    <User className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{driverData?.email}</p>
                      <p className="text-sm text-muted-foreground">Driver Account</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">PIN Status</p>
                      <p className="text-sm text-muted-foreground">
                        {driverData?.pin ? "PIN is set" : "No PIN configured"}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => router.push("/driver/settings")}>
                      {driverData?.pin ? "Change PIN" : "Set PIN"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Account Status</p>
                      <p className="text-sm text-muted-foreground">{driverData?.isActive ? "Active" : "Inactive"}</p>
                    </div>
                    <Badge variant={driverData?.isActive ? "default" : "secondary"}>
                      {driverData?.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
