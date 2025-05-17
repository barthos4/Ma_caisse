"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Category } from "@/types";
import { useCategories } from "@/lib/mock-data";
import { useEffect } from "react";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Le nom de la catégorie est requis.").max(50, "Le nom de la catégorie est trop long."),
  type: z.enum(["income", "expense"], { required_error: "Le type de catégorie est requis." }),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
  categoryToEdit?: Category | null;
  onFormSubmit: () => void;
}

export function CategoryForm({ categoryToEdit, onFormSubmit }: CategoryFormProps) {
  const { addCategory, updateCategory } = useCategories();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: categoryToEdit || {
      name: "",
      type: "expense",
    },
  });

  useEffect(() => {
    if (categoryToEdit) {
      form.reset(categoryToEdit);
    } else {
      form.reset({ name: "", type: "expense" });
    }
  }, [categoryToEdit, form]);

  function onSubmit(data: CategoryFormValues) {
    if (categoryToEdit) {
      updateCategory(categoryToEdit.id, data);
    } else {
      addCategory(data);
    }
    onFormSubmit();
    form.reset({ name: "", type: "expense" });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de la Catégorie</FormLabel>
              <FormControl>
                <Input placeholder="ex: Courses, Salaire" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Type de Catégorie</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex space-x-4"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="income" />
                    </FormControl>
                    <FormLabel className="font-normal">Revenu</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="expense" />
                    </FormControl>
                    <FormLabel className="font-normal">Dépense</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-2">
          <Button type="submit">{categoryToEdit ? "Enregistrer les Modifications" : "Ajouter la Catégorie"}</Button>
        </div>
      </form>
    </Form>
  );
}
