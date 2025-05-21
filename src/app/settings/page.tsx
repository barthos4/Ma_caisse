
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

const settingsFormSchema = z.object({
  companyName: z.string().max(100, "Le nom de l'entreprise est trop long.").optional().nullable(),
  companyAddress: z.string().max(200, "L'adresse de l'entreprise est trop longue.").optional().nullable(),
  // companyLogoUrl est géré séparément pour le téléversement
  rccm: z.string().max(50, "Le RCCM est trop long.").optional().nullable(),
  niu: z.string().max(50, "Le NIU est trop long.").optional().nullable(),
  companyContact: z.string().max(100, "Le contact est trop long.").optional().nullable(),
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
      setSelectedLogoFile(file);
      setLogoPreview(URL.createObjectURL(file)); // Afficher un aperçu local
    }
  };

  async function onSubmit(data: SettingsFormValues) {
    setIsSubmitting(true);
    let logoUrlToSave = settings.companyLogoUrl; // Garder l'ancien logo par défaut

    if (selectedLogoFile) {
      const { publicUrl: uploadedLogoUrl, error: uploadError } = await uploadCompanyLogo(selectedLogoFile);
      if (uploadError) {
        toast({ title: "Erreur de Téléversement", description: uploadError, variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      logoUrlToSave = uploadedLogoUrl; // Utiliser le nouveau logo
      setSelectedLogoFile(null); // Réinitialiser après le téléversement
    } else if (logoPreview === null && settings.companyLogoUrl !== null) {
      // Si l'aperçu est null et qu'il y avait un logo, cela signifie que l'utilisateur veut le supprimer
      // (Bien que nous n'ayons pas de bouton "supprimer", effacer le champ implicitement)
      // Ou si l'utilisateur a effacé un champ URL (si on gardait cette option)
      logoUrlToSave = null;
    }


    const settingsToUpdate: Partial<typeof settings> = {
      ...data,
      companyLogoUrl: logoUrlToSave,
    };
    
    // Filtrer pour ne garder que les champs modifiés ou les champs à nullifier
    const actualUpdates: Partial<typeof settings> = {};
    let hasChanges = false;
    (Object.keys(settingsToUpdate) as Array<keyof typeof settingsToUpdate>).forEach(key => {
        if (settingsToUpdate[key] !== settings[key]) {
            actualUpdates[key] = settingsToUpdate[key];
            hasChanges = true;
        }
    });
    
    if (!hasChanges && !selectedLogoFile) {
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
      fetchSettings(); // Re-fetch pour confirmer et obtenir la dernière version (surtout si le logo a été téléversé)
    } else {
      toast({
        title: "Erreur",
        description: `Impossible d'enregistrer les paramètres. ${settingsHookError || ''}`,
        variant: "destructive",
      });
    }
  }

  const isLoading = isLoadingSettings || isSubmitting;

  if (isLoadingSettings && !form.formState.isDirty && !settings.companyName && !settings.user_id) { 
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
              
              <FormItem>
                <FormLabel>Logo de l'entreprise</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-4">
                    <Input 
                      type="file" 
                      accept="image/png, image/jpeg, image/gif, image/webp" 
                      ref={fileInputRef}
                      onChange={handleFileChange} 
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading}
                    />
                    {/* Optionnel: un bouton pour réinitialiser la sélection de fichier si besoin */}
                    {selectedLogoFile && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => {
                            setSelectedLogoFile(null);
                            setLogoPreview(settings.companyLogoUrl); // Revenir à l'aperçu du logo enregistré
                            if (fileInputRef.current) fileInputRef.current.value = ""; // Réinitialiser l'input file
                        }} disabled={isLoading}>
                            Annuler sélection
                        </Button>
                    )}
                  </div>
                </FormControl>
                {logoPreview && (
                  <div className="mt-4">
                    <FormLabel>Aperçu du logo :</FormLabel>
                    <div className="mt-2 border rounded-md p-2 inline-block bg-muted/30">
                      <Image 
                        src={logoPreview} 
                        alt="Aperçu du logo" 
                        width={150} 
                        height={75} 
                        className="object-contain max-h-[75px]"
                        onError={() => {
                          // Gérer l'erreur si l'URL est cassée, par exemple en n'affichant rien
                          // ou un placeholder
                          setLogoPreview(null); 
                          // Si on veut aussi supprimer l'URL de settings au cas où elle serait invalide:
                          // form.setValue("companyLogoUrl", ""); // Ne pas faire cela directement
                        }}
                        data-ai-hint="company logo"
                      />
                    </div>
                  </div>
                )}
                 {!logoPreview && !isLoadingSettings && (
                    <p className="text-xs text-muted-foreground mt-2">Aucun logo configuré.</p>
                )}
                <FormDescription>Sélectionnez un fichier image (PNG, JPG, GIF, WEBP).</FormDescription>
                <FormMessage />
              </FormItem>

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
              <FormField
                control={form.control}
                name="companyContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact de l'entreprise</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: +237 6XX XXX XXX / email@exemple.com" {...field} value={field.value ?? ""} disabled={isLoading} />
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
