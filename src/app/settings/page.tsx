
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
import { useEffect, useState, useRef } from "react";
import { Separator } from "@/components/ui/separator";
import { Loader2, UploadCloud } from "lucide-react";
import Image from "next/image";
import type { AppSettings } from "@/types";


const settingsFormSchema = z.object({
  companyName: z.string().max(100, "Le nom de l'entreprise est trop long.").optional().nullable(),
  companyAddress: z.string().max(200, "L'adresse de l'entreprise est trop longue.").optional().nullable(),
  rccm: z.string().max(50, "Le RCCM est trop long.").optional().nullable(),
  niu: z.string().max(50, "Le NIU est trop long.").optional().nullable(),
  companyContact: z.string().max(100, "Le contact est trop long.").optional().nullable(),
  // companyLogoUrl est géré par le téléversement de fichier, pas un champ direct pour Zod ici
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const { settings, updateSettings, isLoading: isLoadingSettings, error: settingsHookError, fetchSettings, uploadCompanyLogo } = useSettings();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      companyName: "",
      companyAddress: "",
      rccm: "",
      niu: "",
      companyContact: "",
    },
  });

  useEffect(() => {
    if (settings && !isLoadingSettings) {
      form.reset({
        companyName: settings.companyName || "",
        companyAddress: settings.companyAddress || "",
        rccm: settings.rccm || "",
        niu: settings.niu || "",
        companyContact: settings.companyContact || "",
      });
      if (settings.companyLogoUrl) {
        setLogoPreview(settings.companyLogoUrl);
      } else {
        setLogoPreview(null);
      }
    }
  }, [settings, isLoadingSettings, form]);

  useEffect(() => {
    if (settingsHookError) {
        toast({ title: "Erreur Paramètres", description: settingsHookError, variant: "destructive"})
    }
  }, [settingsHookError, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 2 * 1024 * 1024) { // 2MB limit example
        toast({ title: "Fichier trop volumineux", description: "La taille du logo ne doit pas dépasser 2Mo.", variant: "destructive" });
        if (fileInputRef.current) fileInputRef.current.value = ""; // Clear the input
        return;
      }
      setSelectedLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  async function onSubmit(data: SettingsFormValues) {
    setIsSubmitting(true);
    let logoUrlToSave = settings.companyLogoUrl;

    if (selectedLogoFile) {
      const { publicUrl: uploadedLogoUrl, error: uploadError } = await uploadCompanyLogo(selectedLogoFile);
      if (uploadError) {
        toast({ title: "Erreur de Téléversement", description: `Impossible de téléverser le logo. ${uploadError}`, variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      logoUrlToSave = uploadedLogoUrl;
      setSelectedLogoFile(null); // Réinitialiser après le téléversement réussi
    } else if (logoPreview === null && settings.companyLogoUrl !== null) {
      // Si l'aperçu a été explicitement retiré (par exemple, si on ajoutait un bouton "supprimer logo")
      // et qu'un logo existait, on met l'URL à null pour le supprimer.
      logoUrlToSave = null;
    }


    const settingsToUpdate: Partial<AppSettings> = {
      companyName: data.companyName,
      companyAddress: data.companyAddress,
      rccm: data.rccm,
      niu: data.niu,
      companyContact: data.companyContact,
      companyLogoUrl: logoUrlToSave,
    };

    const actualUpdates: Partial<AppSettings> = {};
    let hasChanges = false;
    (Object.keys(settingsToUpdate) as Array<keyof AppSettings>).forEach(key => {
      const formValue = settingsToUpdate[key];
      const currentValue = settings[key];

      // Gérer la comparaison pour les champs qui peuvent être null ou string vide
      const formIsEmpty = formValue === "" || formValue === null || formValue === undefined;
      const currentIsEmpty = currentValue === "" || currentValue === null || currentValue === undefined;

      if (formIsEmpty && currentIsEmpty) {
        // Les deux sont "vides", pas de changement
      } else if (formValue !== currentValue) {
        actualUpdates[key] = formValue === "" ? null : formValue; // Sauvegarder string vide comme null
        hasChanges = true;
      }
    });
    
    // Vérifier si seulement le logo a changé (si selectedLogoFile a été traité)
    if (selectedLogoFile && logoUrlToSave !== settings.companyLogoUrl) {
        hasChanges = true;
        actualUpdates.companyLogoUrl = logoUrlToSave; // S'assurer que cette mise à jour est incluse
    } else if (logoPreview === null && settings.companyLogoUrl !== null && !selectedLogoFile){
        // Cas où le logo a été supprimé (logoPreview est null, pas de nouveau fichier, mais un logo existait)
        hasChanges = true;
        actualUpdates.companyLogoUrl = null;
    }


    if (!hasChanges) {
      toast({ title: "Aucune modification", description: "Aucun paramètre n'a été modifié." });
      setIsSubmitting(false);
      return;
    }

    const success = await updateSettings(actualUpdates);
    setIsSubmitting(false);

    if (success) {
      toast({
        title: "Paramètres enregistrés",
        description: "Vos modifications ont été sauvegardées avec succès.",
      });
      fetchSettings(); // Re-fetch pour s'assurer que l'état est à jour avec la DB
    } else {
      toast({
        title: "Erreur",
        description: `Impossible d'enregistrer les paramètres. ${settingsHookError || ''}`,
        variant: "destructive",
      });
    }
  }

  const isLoading = isLoadingSettings || isSubmitting;

  if (isLoadingSettings && !form.formState.isDirty && !settings.companyName && (!settings.user_id && !settings.user)) {
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
                  <FormItem className="mt-6">
                    <FormLabel className="block text-center">Adresse de l'entreprise</FormLabel>
                    <FormControl>
                      <div className="flex justify-center">
                        <Textarea 
                          placeholder="Ex: B.P. 123, Avenue Principale, Quartier, Ville" 
                          {...field} 
                          value={field.value ?? ""} 
                          disabled={isLoading}
                          className="max-w-xl" 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyLogoUrl" 
                render={({ field }) => ( 
                  <FormItem className="mt-6">
                    <FormLabel className="block text-center">Logo de l'entreprise</FormLabel>
                    <FormControl>
                      <div className="flex flex-col items-center gap-2"> {/* Changé en items-center et gap-2 */}
                        <Input
                          type="file"
                          accept="image/png, image/jpeg, image/gif, image/webp"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="block w-full max-w-md text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isLoading}
                        />
                        {selectedLogoFile && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => {
                                setSelectedLogoFile(null);
                                setLogoPreview(settings.companyLogoUrl || null); // Revenir à l'ancien logo ou null
                                if (fileInputRef.current) fileInputRef.current.value = "";
                            }} disabled={isLoading}>
                                Annuler sélection
                            </Button>
                        )}
                         {!selectedLogoFile && logoPreview && (
                           <Button type="button" variant="outline" size="sm" onClick={() => {
                                setLogoPreview(null); 
                                // Laisser selectedLogoFile à null. onSubmit s'occupera de mettre companyLogoUrl à null.
                                if (fileInputRef.current) fileInputRef.current.value = "";
                           }} disabled={isLoading}>
                                Supprimer le logo actuel
                           </Button>
                        )}
                      </div>
                    </FormControl>
                    {logoPreview && (
                      <div className="mt-4 text-center">
                        <FormLabel className="block text-center">Aperçu du logo :</FormLabel>
                        <div className="mt-2 border rounded-md p-2 inline-block bg-muted/30">
                          <Image
                            src={logoPreview}
                            alt="Aperçu du logo"
                            width={150}
                            height={75}
                            className="object-contain max-h-[75px]"
                            onError={() => {
                              // Gérer le cas où l'URL du logo est invalide
                              setLogoPreview(null); 
                              toast({title: "Erreur Logo", description: "Impossible de charger l'aperçu du logo. L'URL est peut-être invalide.", variant:"destructive"})
                            }}
                            data-ai-hint="company logo"
                          />
                        </div>
                      </div>
                    )}
                    {!logoPreview && !isLoadingSettings && !isLoading && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">Aucun logo configuré.</p>
                    )}
                    <FormMessage className="text-center"/> {/* Message d'erreur centré aussi */}
                    <p className="text-xs text-muted-foreground text-center mt-1">Sélectionnez un fichier image (PNG, JPG, GIF, WEBP, max 2Mo).</p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rccm"
                render={({ field }) => (
                  <FormItem className="mt-6">
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
              <FormField
                control={form.control}
                name="companyContact"
                render={({ field }) => (
                  <FormItem className="mt-6">
                    <FormLabel className="block text-center">Contact de l'entreprise</FormLabel>
                    <FormControl>
                       <div className="flex justify-center">
                        <Input 
                          placeholder="Ex: +237 6XX XXX XXX / email@exemple.com" 
                          {...field} 
                          value={field.value ?? ""} 
                          disabled={isLoading}
                          className="max-w-xl" 
                        />
                      </div>
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

    