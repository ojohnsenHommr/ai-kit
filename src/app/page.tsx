"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const cards = [
  {
    title: "corp.inc Chatbot",
    infoText: "Interact with our AI Chatbot.",
    route: "/chat",
  },
  {
    title: "corp.inc Translator",
    infoText: "Leverage our corp translation tool.",
    route: "/translate",
  },
  {
    title: "corp.inc Policy Simplifier",
    infoText: "Simplify corporate policies into plain language.",
    route: "/hr/policy",
  },
  {
    title: "corp.inc CodeGen",
    infoText: "Generate code for web apps with our CodeGen tool.",
    route: "/codegen",
  },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      <h1 className="text-4xl font-bold text-center">corp.inc</h1>
      <div className="grid gap-6 sm:grid-cols-2">
        {cards.map((card, index) => (
          <Card
            key={index}
            onClick={() => router.push(card.route)}
            className="cursor-pointer hover:shadow-xl transition-shadow"
          >
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label className="text-sm text-gray-600">
                {card.infoText}
              </Label>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
