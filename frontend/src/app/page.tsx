import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Activity, Calendar, Shield, MapPin, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "MediConnect | Modern Healthcare Platform",
  description: "Book appointments, manage records, and find top doctors near you.",
};

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">MediConnect</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</Link>
            <Link href="#solutions" className="text-gray-600 hover:text-gray-900 transition-colors">Solutions</Link>
            <Link href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">About Us</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 hidden sm:block">
              Log in
            </Link>
            <Link href="/register">
              <Button className="bg-gray-900 hover:bg-gray-800 text-white rounded-md px-5 shadow-sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-sm font-medium text-gray-600 mb-8 bg-white shadow-sm">
                  <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
                  The new standard in healthcare IT
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 mb-6 leading-[1.1]">
                  Healthcare infrastructure for the modern era.
                </h1>
                <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto lg:mx-0">
                  A unified platform bridging the gap between patients, medical professionals, and hospitals with seamless scheduling, secure records, and dynamic discovery.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <Link href="/register">
                    <Button size="lg" className="w-full sm:w-auto rounded-md bg-primary hover:bg-primary/90 text-white text-base px-8 h-12 shadow-sm">
                      Start for free
                    </Button>
                  </Link>
                  <Link href="/register?role=doctor">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-md text-base px-8 h-12 border-gray-300 text-gray-700 hover:bg-gray-50">
                      Join as a Provider
                    </Button>
                  </Link>
                </div>
                
                <div className="mt-10 flex items-center justify-center lg:justify-start gap-8 text-sm text-gray-500">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> HIPAA Compliant</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> End-to-end Encryption</div>
                </div>
              </div>
              
              <div className="flex-1 relative w-full max-w-2xl lg:max-w-none">
                <div className="aspect-[4/3] relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-gray-50">
                  <Image
                    src="/hero-dashboard.png"
                    alt="MediConnect Dashboard Preview"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                
                {/* Decorative floating elements */}
                <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Dr. Smith confirmed</p>
                    <p className="text-xs text-gray-500">Today at 2:30 PM</p>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </section>

        {/* Logos Section */}
        <section className="border-y border-gray-100 bg-gray-50/50 py-10">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm font-medium text-gray-500 mb-6 uppercase tracking-widest">Trusted by innovative healthcare providers</p>
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale">
              <span className="text-xl font-bold tracking-tight">ApolloHealth</span>
              <span className="text-xl font-bold tracking-tight">ClevelandCare</span>
              <span className="text-xl font-bold tracking-tight">MayoTech</span>
              <span className="text-xl font-bold tracking-tight">KaiserDigital</span>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">A powerful suite of tools for everyone</h2>
              <p className="text-lg text-gray-500">We've built a comprehensive ecosystem that streamlines operations, secures patient data, and makes finding care intuitive.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-8 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded bg-white border border-gray-200 shadow-sm flex items-center justify-center text-primary mb-6">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Intelligent Scheduling</h3>
                <p className="text-gray-500 leading-relaxed">
                  Advanced conflict prevention and real-time availability sync. Reschedule or cancel with automated push notifications and email alerts.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-8 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded bg-white border border-gray-200 shadow-sm flex items-center justify-center text-blue-600 mb-6">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Geospatial Discovery</h3>
                <p className="text-gray-500 leading-relaxed">
                  Find nearby hospitals and specialists using our modern map interface. Filter by radius, specialty, wait times, and real patient ratings.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-8 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded bg-white border border-gray-200 shadow-sm flex items-center justify-center text-indigo-600 mb-6">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure Records</h3>
                <p className="text-gray-500 leading-relaxed">
                  Military-grade cloud storage for medical records. Upload reports, track vitals, and grant expiring cryptographic access to your doctors securely.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-24 bg-gray-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/10"></div>
          <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Ready to transform your healthcare experience?</h2>
            <p className="text-xl text-gray-400 mb-10">Join thousands of patients and doctors already using MediConnect.</p>
            <Link href="/register">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-md px-10 h-14 text-lg shadow-xl">
                Create your free account
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white pt-16 pb-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-primary" />
                <span className="font-bold text-gray-900">MediConnect</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">Modernizing healthcare infrastructure for the internet age.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><Link href="#" className="hover:text-primary">Features</Link></li>
                <li><Link href="#" className="hover:text-primary">Pricing</Link></li>
                <li><Link href="#" className="hover:text-primary">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><Link href="#" className="hover:text-primary">About</Link></li>
                <li><Link href="#" className="hover:text-primary">Careers</Link></li>
                <li><Link href="#" className="hover:text-primary">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><Link href="#" className="hover:text-primary">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-primary">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-primary">HIPAA Compliance</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} MediConnect Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
