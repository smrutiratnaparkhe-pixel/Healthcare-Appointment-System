"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Activity, Loader2, ArrowRight, Building, ShieldCheck, Mail, MapPin, Building2, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const registerHospitalSchema = z.object({
  // Admin Details
  firstName: z.string().min(2, { message: "First name is required" }),
  lastName: z.string().min(2, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().optional(),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Please confirm your password" }),
  
  // Hospital Details
  hospitalName: z.string().min(3, { message: "Hospital name is required" }),
  registrationNumber: z.string().min(3, { message: "Registration/License number is required" }),
  hospitalEmail: z.string().email({ message: "Invalid hospital email" }),
  hospitalPhone: z.string().min(5, { message: "Hospital phone is required" }),
  addressLine1: z.string().min(5, { message: "Address is required" }),
  city: z.string().min(2, { message: "City is required" }),
  state: z.string().min(2, { message: "State is required" }),
  zipCode: z.string().min(3, { message: "ZIP code is required" }),
  description: z.string().optional(),
  specialties: z.string().optional(),
  bedCount: z.string().min(1, { message: "At least 1 bed is required" }),
  emergencyServices: z.boolean().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function RegisterHospitalPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);

  const form = useForm<z.infer<typeof registerHospitalSchema>>({
    resolver: zodResolver(registerHospitalSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      hospitalName: "",
      registrationNumber: "",
      hospitalEmail: "",
      hospitalPhone: "",
      addressLine1: "",
      city: "",
      state: "",
      zipCode: "",
      description: "",
      specialties: "",
      bedCount: "100",
      emergencyServices: false,
    },
  });

  async function onSubmit(values: z.infer<typeof registerHospitalSchema>) {
    setIsLoading(true);
    try {
      const response: any = await api.post("/auth/register-hospital", values);
      
      // Enrich user with hospitalAdmin data so "Under Review" screen shows immediately
      const userData = {
        ...response.data.user,
        hospitalAdmin: {
          hospital_id: response.data.hospital?.id,
          hospital_name: values.hospitalName,
          hospital_is_verified: false,
          hospital_is_active: false,
        }
      };
      setUser(userData);
      
      toast.success("Hospital application submitted successfully!");
      
      // The hospital is pending, redirect to hospital dashboard which will show the "Under Review" screen
      router.push("/hospital");
      
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex w-full bg-gray-50">
      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          
          <div className="bg-[#10b981] p-8 text-white">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                <Building className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight">MediConnect Enterprise</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight mt-4">Partner Hospital Registration</h1>
            <p className="text-emerald-50 mt-2 opacity-90 max-w-xl">
              Apply to join our healthcare network. Your application will be reviewed by our Super Admins to ensure compliance and quality of care.
            </p>
          </div>

          <div className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Hospital Details Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4 flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-emerald-500" />
                    Hospital Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="hospitalName" render={({ field }) => (
                      <FormItem className="col-span-1 md:col-span-2">
                        <FormLabel>Legal Hospital Name</FormLabel>
                        <FormControl><Input placeholder="E.g. Apollo Hospitals" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="registrationNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration / License Number</FormLabel>
                        <FormControl><Input placeholder="REG-XXX-YYYY" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="bedCount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Bed Capacity</FormLabel>
                        <FormControl><Input type="number" placeholder="100" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="hospitalEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Official Hospital Email</FormLabel>
                        <FormControl><Input type="email" placeholder="contact@hospital.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="hospitalPhone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hospital Contact Number</FormLabel>
                        <FormControl><Input placeholder="+1 234 567 890" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem className="col-span-1 md:col-span-2">
                        <FormLabel>Hospital Description (Optional)</FormLabel>
                        <FormControl><textarea placeholder="Brief description of your hospital, services offered, and mission..." className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-none" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="specialties" render={({ field }) => (
                      <FormItem className="col-span-1 md:col-span-2">
                        <FormLabel>Hospital Specialties (Optional)</FormLabel>
                        <FormControl><Input placeholder="e.g. Cardiology, Neurology, Orthopedics" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="addressLine1" render={({ field }) => (
                      <FormItem className="col-span-1 md:col-span-2">
                        <FormLabel>Street Address</FormLabel>
                        <FormControl><Input placeholder="123 Medical Parkway" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl><Input placeholder="New York" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="state" render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl><Input placeholder="NY" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="zipCode" render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl><Input placeholder="10001" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="emergencyServices" render={({ field }) => (
                      <FormItem className="col-span-1 md:col-span-2 flex items-center gap-3 space-y-0 mt-2">
                        <FormControl>
                          <input type="checkbox" checked={field.value} onChange={field.onChange} className="h-5 w-5 rounded border-gray-300 text-[#10b981] focus:ring-[#10b981] accent-[#10b981] cursor-pointer" />
                        </FormControl>
                        <FormLabel className="text-sm font-medium text-gray-700 cursor-pointer">This hospital provides 24/7 emergency services</FormLabel>
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Admin Details Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4 mt-6 flex items-center">
                    <ShieldCheck className="w-5 h-5 mr-2 text-emerald-500" />
                    Administrator Account
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl><Input placeholder="John" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl><Input placeholder="Doe" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Email Address</FormLabel>
                        <FormControl><Input type="email" placeholder="admin@hospital.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Phone (Optional)</FormLabel>
                        <FormControl><Input placeholder="+1 234 567 890" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl><Input type="password" placeholder="Create a strong password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl><Input type="password" placeholder="Confirm your password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
                
                <div className="pt-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-gray-500">
                    Already a partner? <Link href="/login" className="text-[#10b981] font-semibold hover:underline">Log in</Link>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full sm:w-auto h-12 px-8 bg-[#10b981] hover:bg-[#059669] text-white shadow-lg shadow-emerald-500/25" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : null}
                    Submit Application for Review
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
