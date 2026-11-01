"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Activity, Loader2, ArrowRight } from "lucide-react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const registerSchema = z.object({
  firstName: z.string().min(2, { message: "First name is required" }),
  lastName: z.string().min(2, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  role: z.enum(["patient", "doctor"]),
});

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "patient",
    },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    setIsLoading(true);
    try {
      const response: any = await api.post("/auth/register", values);
      setUser(response.data.user);
      
      toast.success("Account created successfully!");
      
      const roles = response.data.user.roles || [];
      if (roles.includes("doctor")) {
        router.push("/doctor");
      } else {
        router.push("/patient");
      }
      
    } catch (error: any) {
      toast.error(error.message || "Failed to register");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex w-full bg-white">
      {/* Left Form Section */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 lg:px-24 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white shadow-sm">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">MediConnect</span>
          </div>

          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight mb-2">Create an account</h1>
          <p className="text-gray-500 mb-8">Join thousands of others managing healthcare effortlessly.</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" className="h-11 shadow-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" className="h-11 shadow-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" className="h-11 shadow-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Create a strong password" className="h-11 shadow-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">I am registering as a...</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 w-full shadow-sm bg-gray-50/50 text-base border-gray-300 focus:ring-primary">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="patient" className="text-base py-3">Patient seeking care</SelectItem>
                        <SelectItem value="doctor" className="text-base py-3">Medical Professional</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium shadow-sm group mt-2" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4 ml-2 opacity-70 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-8 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:text-primary/80 transition-colors">
              Sign in instead
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link href="/register/hospital" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100 hover:border-emerald-200 transition-all hover:shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              Register as Hospital
            </Link>
          </div>
        </div>
      </div>

      {/* Right Content Section - Aesthetic & Healthcare Focused */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-green-50 via-white to-teal-50 relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        
        {/* Abstract shapes for aesthetic feel */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-100 rounded-full filter blur-3xl" />

        <div className="relative max-w-lg text-center lg:text-left">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-green-600 mr-2" />
            Healthcare Platform of the Future
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-6 leading-tight">
            Empowering Better <span className="text-primary">Healthcare</span> Connections.
          </h2>
          
          <p className="text-lg text-gray-600 mb-12 leading-relaxed">
            Join a secure, seamless, and patient-centered platform designed to make medical management effortless for everyone.
          </p>

          {/* Feature List instead of Image */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-primary flex-shrink-0 border border-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.03A12.02 12.02 0 003 14c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Enterprise Security</h3>
                <p className="text-sm text-gray-500">Your data is protected with HIPAA compliant encryption.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-primary flex-shrink-0 border border-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Real-time Coordination</h3>
                <p className="text-sm text-gray-500">Instant scheduling and communication between patients and doctors.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
