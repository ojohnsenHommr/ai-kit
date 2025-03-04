"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      <h1 className="text-4xl font-bold text-center">corp.inc</h1>
      <div className="grid gap-6 sm:grid-cols-2">
        <Card
          onClick={() => router.push("/chat")}
          className="cursor-pointer hover:shadow-xl transition-shadow"
        >
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              corp.inc Chatbot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label className="text-sm text-gray-600">
              Interact with our AI Chatbot.
            </Label>
          </CardContent>
        </Card>
        <Card
          onClick={() => router.push("/translate")}
          className="cursor-pointer hover:shadow-xl transition-shadow"
        >
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              corp.inc Translator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label className="text-sm text-gray-600">
              Leverage our corp translation tool.
            </Label>
          </CardContent>
        </Card>
        <Card
          onClick={() => router.push("/hr/policy")}
          className="cursor-pointer hover:shadow-xl transition-shadow"
        >
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              corp.inc Policy Simplifier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label className="text-sm text-gray-600">
              Simplify corporate policies into plain language.
            </Label>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
