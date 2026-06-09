
// src/app/(app)/careers/page.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, Smartphone, Code2, Globe2, HeartHandshake, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CareersPage() {
  const requirements = [
    "Proficiency in React and React Native (Cross-platform iOS/Android development).",
    "Experience with Firebase services (Firestore, Authentication, Cloud Functions).",
    "Strong understanding of mobile UI/UX principles and gesture-based navigation.",
    "Familiarity with the Nigerian fintech or logistics landscape is a big plus.",
    "Ability to work in a fast-paced environment and take ownership of features."
  ];

  return (
    <div className="container mx-auto py-12 max-w-4xl space-y-12">
      <section className="text-center space-y-4">
        <Badge variant="secondary" className="px-4 py-1 text-sm rounded-full">We are hiring!</Badge>
        <h1 className="text-4xl md:text-6xl font-extrabold text-primary tracking-tight">
          Help us build the future of Nigerian Commerce.
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Dailybuy is on a mission to digitize the "hustle" of local markets. We're looking for visionary developers to take our platform to the mobile world.
        </p>
      </section>

      <Card className="border-2 border-primary/20 shadow-2xl">
        <CardHeader className="bg-primary/5 pb-8">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-3xl font-bold">Cross-Platform Mobile Developer</CardTitle>
              <CardDescription className="text-lg">Full-time • Remote (Nigeria Preferred)</CardDescription>
            </div>
            <Badge className="bg-green-600">Active Opening</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-8 space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" /> The Opportunity
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                As our first Mobile Developer, you will be responsible for bringing Dailybuy to the palms of millions. You'll translate our web vision into a native mobile experience, focusing on real-time tracking, seamless payments, and offline-first market interactions.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Code2 className="h-5 w-5 text-primary" /> Tech Stack
              </h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">React Native</Badge>
                <Badge variant="outline">TypeScript</Badge>
                <Badge variant="outline">Firebase</Badge>
                <Badge variant="outline">Tailwind CSS</Badge>
                <Badge variant="outline">Expo</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" /> What we're looking for:
            </h3>
            <ul className="grid md:grid-cols-1 gap-3">
              {requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-3 text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  <span className="bg-primary/10 text-primary rounded-full p-1 mt-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
        <CardFooter className="bg-primary/5 p-8 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="space-y-1">
            <p className="font-bold text-lg">Ready to make an impact?</p>
            <p className="text-sm text-muted-foreground">Apply with your portfolio and a link to your best mobile project.</p>
          </div>
          <Button size="lg" className="w-full sm:w-auto h-14 px-10 text-lg group">
            Apply Now <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </CardFooter>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="p-6 bg-card border rounded-xl text-center space-y-3">
          <Smartphone className="h-10 w-10 text-primary mx-auto" />
          <h4 className="font-bold">Mobile First</h4>
          <p className="text-sm text-muted-foreground">Join us as we pivot to be a primary mobile player in the market.</p>
        </div>
        <div className="p-6 bg-card border rounded-xl text-center space-y-3">
          <Globe2 className="h-10 w-10 text-primary mx-auto" />
          <h4 className="font-bold">Local Impact</h4>
          <p className="text-sm text-muted-foreground">Support thousands of local vendors in scaling their businesses.</p>
        </div>
        <div className="p-6 bg-card border rounded-xl text-center space-y-3">
          <HeartHandshake className="h-10 w-10 text-primary mx-auto" />
          <h4 className="font-bold">Build Culture</h4>
          <p className="text-sm text-muted-foreground">Be a founding member of our engineering culture.</p>
        </div>
      </div>
    </div>
  );
}
