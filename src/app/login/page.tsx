
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth.tsx";
import Link from "next/link";
import { Briefcase, Loader2 } from "lucide-react";

const loginFormSchema = z.object({
  email: z.string().email("L'adresse e-mail n'est pas valide."),
  password: z.string().min(1, "Le mot de passe est requis."),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading: isAuthLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setError(null);
    setIsSubmitting(true);
    const { error: loginError } = await login(data.email, data.password);
    setIsSubmitting(false);
    if (loginError) {
      setError(loginError.message || "Email ou mot de passe incorrect.");
    } else {
      // La redirection est gérée par le hook useAuth via onAuthStateChange
      // router.replace("/"); 
    }
  }

  const isLoading = isAuthLoading || isSubmitting;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Briefcase className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <CardDescription>Accédez à votre espace GESTION CAISSE.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="nom@exemple.com" {...field} disabled={isLoading} />
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
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Se connecter
              </Button>
            </form>
          </Form>
        </CardContent>
        {/* Le CardFooter avec le lien d'inscription a été retiré */}
      </Card>
    </div>
  );
}
