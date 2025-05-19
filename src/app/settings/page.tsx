
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Separator } from "@/components/ui/separator";

const settingsFormSchema = z.object({
  companyName: z.string().max(100, "Le nom de l'entreprise est trop long.").optional(),
  companyAddress: z.string().max(200, "L'adresse de l'entreprise est trop longue.").optional(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const { settings, updateSettings, isLoading } = useSettings();
  const { toast } = useToast();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      companyName: settings.companyName || "",
      companyAddress: settings.companyAddress || "",
    },
  });

  useEffect(() => {
    if (!isLoading) {
      form.reset({
        companyName: settings.companyName || "",
        companyAddress: settings.companyAddress || "",
      });
    }
  }, [settings, isLoading, form]);

  function onSubmit(data: SettingsFormValues) {
    const success = updateSettings(data);
    if (success) {
      toast({
        title: "Paramètres enregistrés",
        description: "Vos modifications ont été sauvegardées avec succès.",
      });
    } else {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les paramètres.",
        variant: "destructive",
      });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">Chargement des paramètres...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez les informations de votre entreprise et les préférences de l'application.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations de l'Entreprise</CardTitle>
              <CardDescription>
                Ces informations seront utilisées dans les en-têtes de vos rapports et documents exportés.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l'entreprise</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: GESTION CAISSE SARL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="companyAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse de l'entreprise</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: B.P. 123, Avenue Principale, Quartier, Ville" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit">Enregistrer les Informations</Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
      
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Préférences de Formatage</CardTitle>
          <CardDescription>
            Personnalisez l'affichage des dates et des nombres (Fonctionnalité à venir).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Section en cours de développement. Vous pourrez bientôt choisir votre format de date préféré.
          </p>
          {/* Exemple de ce qui pourrait être ici :
          <div className="mt-4 space-y-2">
            <Label htmlFor="date-format">Format de date</Label>
            <Select disabled>
              <SelectTrigger id="date-format">
                <SelectValue placeholder="jj/mm/aaaa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dd/mm/yyyy">jj/mm/aaaa</SelectItem>
                <SelectItem value="mm/dd/yyyy">mm/jj/aaaa</SelectItem>
                <SelectItem value="yyyy-mm-dd">aaaa-mm-jj</SelectItem>
              </SelectContent>
            </Select>
          </div>
          */}
        </CardContent>
      </Card>
      
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Configuration des Notifications</CardTitle>
          <CardDescription>
            Gérez vos préférences de notification (Fonctionnalité à venir).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Section en cours de développement. Vous pourrez bientôt configurer les alertes et notifications.
          </p>
          {/* Exemple :
          <div className="mt-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Switch id="email-notifications" disabled />
              <Label htmlFor="email-notifications">Activer les notifications par e-mail</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="inapp-notifications" disabled />
              <Label htmlFor="inapp-notifications">Activer les notifications dans l'application</Label>
            </div>
          </div>
           */}
        </CardContent>
      </Card>
    </div>
  );
}
