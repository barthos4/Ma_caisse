
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez les paramètres de votre application.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paramètres de l'Application</CardTitle>
          <CardDescription>
            D'autres options de configuration seront ajoutées ici bientôt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Pour l'instant, cette section est en cours de développement.
            Quels types de paramètres aimeriez-vous pouvoir configurer ici ?
            Par exemple :
          </p>
          <ul className="list-disc pl-5 mt-2 text-sm text-muted-foreground">
            <li>Nom de l'entreprise pour les en-têtes de rapport.</li>
            <li>Adresse de l'entreprise.</li>
            <li>Préférences de formatage (par exemple, format de date).</li>
            <li>Configuration des notifications.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
