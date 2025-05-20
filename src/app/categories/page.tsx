
"use client";
import { useState, useEffect } from "react";
import { CategoryForm } from "./category-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit2, Trash2, Loader2 } from "lucide-react";
import type { Category } from "@/types";
import { useCategories } from "@/lib/mock-data"; // Updated path if you moved hooks
import { useToast } from "@/hooks/use-toast";

export default function CategoriesPage() {
  const { categories, isLoading, error, deleteCategory, fetchCategories } = useCategories();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (error) {
      toast({ title: "Erreur", description: error, variant: "destructive" });
    }
  }, [error, toast]);

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette catégorie ? Cette action est irréversible.")) {
      const success = await deleteCategory(id);
      if (success) {
        toast({ title: "Succès", description: "Catégorie supprimée." });
      } else {
        // L'alerte d'erreur est gérée par le hook ou ici si une erreur spécifique est retournée.
        // Si deleteCategory gère déjà les toasts d'erreur, cette partie peut être simplifiée.
         toast({ title: "Erreur", description: "Impossible de supprimer la catégorie. Vérifiez qu'elle n'est pas utilisée.", variant: "destructive" });
      }
    }
  };
  
  const getCategoryTypeName = (type: 'income' | 'expense') => {
    return type === 'income' ? 'Revenu' : 'Dépense';
  }

  const handleFormSubmit = () => {
    setIsFormOpen(false);
    fetchCategories(); // Re-fetch categories after add/edit
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catégories</h1>
          <p className="text-muted-foreground">Organisez vos revenus et dépenses.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddCategory} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une Catégorie
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md print:hidden">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Modifier" : "Ajouter"} une Catégorie</DialogTitle>
            </DialogHeader>
            <CategoryForm 
              categoryToEdit={editingCategory} 
              onFormSubmit={handleFormSubmit} 
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Catégories</CardTitle>
          <CardDescription>Toutes vos catégories définies.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {!isLoading && error && (
             <p className="text-center text-destructive">Erreur de chargement des catégories: {error}</p>
          )}
          {!isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                      Aucune catégorie pour le moment. Cliquez sur "Ajouter une Catégorie" pour en créer une.
                    </TableCell>
                  </TableRow>
                )}
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      <Badge variant={category.type === 'income' ? 'default' : 'secondary'} className={category.type === 'income' ? 'bg-accent text-accent-foreground border-accent' : ''}>
                        {getCategoryTypeName(category.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)} className="mr-1" aria-label="Modifier">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)} className="text-destructive hover:text-destructive" aria-label="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
