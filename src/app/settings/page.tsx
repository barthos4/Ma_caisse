
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

const settingsFormSchema = z.object({
  companyName: z.string().max(100, "Le nom de l'entreprise est trop long.").optional().nullable(),
  companyAddress: z.string().max(200, "L'adresse de l'entreprise est trop longue.").optional().nullable(),
  companyLogoUrl: z.string().url("Veuillez entrer une URL valide pour le logo.").optional().nullable().or(z.literal('')),
  rccm: z.string().max(50, "Le RCCM est trop long.").optional().nullable(),
  niu: z.string().max(50, "Le NIU est trop long.").optional().nullable(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const { settings, updateSettings, isLoading: isLoadingSettings, error, fetchSettings } = useSettings();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      companyName: "",
      companyAddress: "",
      companyLogoUrl: "",
      rccm: "",
      niu: "",
    },
  });

  useEffect(() => {
    if (settings && !isLoadingSettings) {
      form.reset({
        companyName: settings.companyName || "",
        companyAddress: settings.companyAddress || "",
        companyLogoUrl: settings.companyLogoUrl || "",
        rccm: settings.rccm || "",
        niu: settings.niu || "",
      });
    }
  }, [settings, isLoadingSettings, form]);

  useEffect(() => {
    if (error) {
        toast({ title: "Erreur Paramètres", description: error, variant: "destructive"})
    }
  }, [error, toast]);

  async function onSubmit(data: SettingsFormValues) {
    setIsSubmitting(true);
    const settingsToUpdate: Partial<SettingsFormValues> = {};
    if (data.companyName !== settings.companyName) settingsToUpdate.companyName = data.companyName;
    if (data.companyAddress !== settings.companyAddress) settingsToUpdate.companyAddress = data.companyAddress;
    if (data.companyLogoUrl !== settings.companyLogoUrl) settingsToUpdate.companyLogoUrl = data.companyLogoUrl || null;
    if (data.rccm !== settings.rccm) settingsToUpdate.rccm = data.rccm;
    if (data.niu !== settings.niu) settingsToUpdate.niu = data.niu;

    if (Object.keys(settingsToUpdate).length === 0) {
      toast({ title: "Aucune modification", description: "Aucun paramètre n'a été modifié." });
      setIsSubmitting(false);
      return;
    }
    
    const success = await updateSettings(settingsToUpdate);
    setIsSubmitting(false);
    if (success) {
      toast({
        title: "Paramètres enregistrés",
        description: "Vos modifications ont été sauvegardées avec succès.",
      });
      fetchSettings(); 
    } else {
      toast({
        title: "Erreur",
        description: `Impossible d'enregistrer les paramètres. ${error || ''}`,
        variant: "destructive",
      });
    }
  }

  const isLoading = isLoadingSettings || isSubmitting;

  if (isLoadingSettings && !form.formState.isDirty && !settings.companyName) { 
    return (
      <div className="space-y-6 flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
                      <Input placeholder="Ex: GESTION CAISSE SARL" {...field} value={field.value ?? ""} disabled={isLoading} />
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
                      <Textarea placeholder="Ex: B.P. 123, Avenue Principale, Quartier, Ville" {...field} value={field.value ?? ""} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="companyLogoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL du Logo de l'entreprise</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://exemple.com/logo.png" {...field} value={field.value ?? ""} disabled={isLoading} />
                    </FormControl>
                    <FormDescription>Collez l'URL d'un logo hébergé en ligne.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rccm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>N° RCCM</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: RC/DLA/2024/A/1234" {...field} value={field.value ?? ""} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="niu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>N° NIU (Contribuable)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: M012345678901X" {...field} value={field.value ?? ""} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer les Informations
              </Button>
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
        </CardContent>
      </Card>
    </div>
  );
}
