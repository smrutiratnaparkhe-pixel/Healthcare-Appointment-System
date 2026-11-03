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
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { demoDashboardPath, demoRoleLabels, type DemoRole } from "@/lib/demo";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const startDemo = useAuthStore((state) => state.startDemo);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function enterDemo(role: DemoRole) {
    startDemo(role);
    toast.success(`Opening ${demoRoleLabels[role]} demo dashboard`);
    router.push(demoDashboardPath(role));
  }


async function onSubmit(values: z.infer<typeof loginSchema>) {
  setIsLoading(true);

  try {
    const response: any = await api.post("/auth/login", {
      email: values.email.trim(),
      password: values.password,
    });

    const data = response.data;
    const loggedInUser = data.user;

    if (!loggedInUser) {
      throw new Error("User details were not returned by the server.");
    }

    setUser({
      id: loggedInUser.id,
      email: loggedInUser.email,
      firstName: loggedInUser.firstName || "",
      lastName: loggedInUser.lastName || "",
      roles: loggedInUser.roles || [],
      avatar: loggedInUser.avatar || "",
      firstLoginCompleted: true,
    });

    toast.success("Login successful");

    if (loggedInUser.roles?.includes("super_admin")) {
      router.push("/admin");
    } else if (loggedInUser.roles?.includes("hospital_admin")) {
      router.push("/hospital");
    } else if (loggedInUser.roles?.includes("doctor")) {
      router.push("/doctor");
    } else {
      router.push("/patient");
    }
  } catch (error: any) {
    toast.error(error.message || "Login failed. Check your email and password.");
  } finally {
    setIsLoading(false);
  }
}


  return (
    <div className="min-h-screen flex w-full bg-white">
      {/* Left Form Section */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 lg:px-24">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-12">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white shadow-sm">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">MediConnect</span>
          </div>

          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight mb-2">Welcome back</h1>
          <p className="text-gray-500 mb-8">Please enter your details to sign in.</p>

          <section className="mb-7 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4" aria-label="Explore demo dashboards">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-emerald-950">Explore the dashboards</h2>
              <p className="mt-1 text-xs text-emerald-800">Choose a sample role. Demo mode works without a database.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['patient', 'doctor', 'hospital_admin', 'super_admin'] as DemoRole[]).map((role) => (
                <Button key={role} type="button" variant="outline" onClick={() => enterDemo(role)}
                  className="h-9 border-emerald-200 bg-white text-xs text-emerald-900 hover:bg-emerald-100">
                  {demoRoleLabels[role]}
                </Button>
              ))}
            </div>
          </section>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="name@example.com" 
                        className="h-11 border-gray-300 focus-visible:ring-primary shadow-sm"
                        {...field} 
                      />
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
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-gray-700 font-medium">Password</FormLabel>
                      <Link href="/forgot-password" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        className="h-11 border-gray-300 focus-visible:ring-primary shadow-sm"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium shadow-sm group" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 ml-2 opacity-70 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-8 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary font-semibold hover:text-primary/80 transition-colors">
              Sign up for free
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
            Welcome Back to <span className="text-primary">MediConnect</span>.
          </h2>
          
          <p className="text-lg text-gray-600 mb-12 leading-relaxed">
            Access your secure dashboard to manage appointments, view records, and connect with care.
          </p>

          {/* Feature List/Trust Points */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-primary flex-shrink-0 border border-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.03A12.02 12.02 0 003 14c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Secure Access</h3>
                <p className="text-sm text-gray-500">Multi-factor authentication and end-to-end encryption.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-primary flex-shrink-0 border border-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Lightning Fast</h3>
                <p className="text-sm text-gray-500">Access your medical history and schedule in seconds.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
