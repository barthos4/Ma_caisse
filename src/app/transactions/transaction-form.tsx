
"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Transaction, Category } from "@/types";
import { useTransactions } from "@/lib/mock-data";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

const transactionFormSchema = z.object({
  orderNumber: z.string().max(50, "Le N° d'ordre ne peut pas dépasser 50 caractères.").optional().nullable(),
  date: z.date({ required_error: "Une date est requise." }),
  description: z.string().min(1, "La description est requise.").max(100, "La description est trop longue."),
  reference: z.string().max(50, "La référence ne peut pas dépasser 50 caractères.").optional().nullable(),
  amount: z.coerce.number().positive("Le montant doit être positif."),
  type: z.enum(["income", "expense"], { required_error: "Le type de transaction est requis." }),
  categoryId: z.string().min(1, "La catégorie est requise.").nullable(), // Peut être nullable si pas de catégorie
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface TransactionFormProps {
  transactionToEdit?: Transaction | null;
  onFormSubmit: () => void;
  availableCategories: Category[]; // Passer les catégories disponibles
}

export function TransactionForm({ transactionToEdit, onFormSubmit, availableCategories }: TransactionFormProps) {
  const { addTransaction, updateTransaction } = useTransactions();
  const { toast } = useToast();
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: transactionToEdit
      ? {
          ...transactionToEdit,
          amount: Math.abs(transactionToEdit.amount), 
          orderNumber: transactionToEdit.orderNumber || "",
          reference: transactionToEdit.reference || "",
          categoryId: transactionToEdit.categoryId || null,
        }
      : {
          orderNumber: "",
          date: new Date(),
          description: "",
          reference: "",
          amount: 0,
          type: "expense",
          categoryId: null,
        },
  });
  
  const transactionType = form.watch("type");

  useEffect(() => {
    const filtered = availableCategories.filter(c => c.type === transactionType);
    setFilteredCategories(filtered);
    
    const currentCategoryId = form.getValues("categoryId");
    if (currentCategoryId && !filtered.find(c => c.id === currentCategoryId)) {
        form.setValue("categoryId", null); // Réinitialiser si la catégorie n'est plus valide
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionType, availableCategories, form.getValues, form.setValue]);


  useEffect(() => {
    if (transactionToEdit) {
      form.reset({
        ...transactionToEdit,
        amount: Math.abs(transactionToEdit.amount),
        orderNumber: transactionToEdit.orderNumber || "",
        reference: transactionToEdit.reference || "",
        categoryId: transactionToEdit.categoryId || null,
      });
    } else {
      form.reset({
        orderNumber: "",
        date: new Date(),
        description: "",
        reference: "",
        amount: 0,
        type: "expense",
        categoryId: null,
      });
    }
  }, [transactionToEdit, form]);

  async function onSubmit(data: TransactionFormValues) {
    const dataToSubmit: Omit<Transaction, 'id' | 'user_id'> = {
        date: data.date,
        description: data.description,
        reference: data.reference || undefined,
        amount: data.amount,
        type: data.type,
        categoryId: data.categoryId || "", // Envoyer une string vide si null, ou adapter le type Transaction
        orderNumber: data.orderNumber || undefined,
    };

    let success;
    if (transactionToEdit) {
      success = await updateTransaction(transactionToEdit.id, dataToSubmit);
      if (success) {
        toast({ title: "Succès", description: "Transaction modifiée." });
      } else {
        toast({ title: "Erreur", description: "Impossible de modifier la transaction.", variant: "destructive" });
      }
    } else {
      const newTransaction = await addTransaction(dataToSubmit);
      success = !!newTransaction;
      if (success) {
        toast({ title: "Succès", description: "Transaction ajoutée." });
      } else {
        toast({ title: "Erreur", description: "Impossible d'ajouter la transaction.", variant: "destructive" });
      }
    }

    if (success) {
      onFormSubmit();
      form.reset({ orderNumber: "", date: new Date(), description: "", reference: "", amount: 0, type: "expense", categoryId: null });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="orderNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>N° d'ordre (Optionnel)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: 001" 
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? format(field.value, "PPP", { locale: fr }) : <span>Choisissez une date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="ex: Courses, Salaire" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Référence (Optionnel)</FormLabel>
              <FormControl>
                <Input placeholder="ex: Facture #123, Chèque #456" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Montant</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} step="1" />
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
              <FormLabel>Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => {
                    field.onChange(value);
                  }}
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

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Catégorie</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une catégorie" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                  {filteredCategories.length === 0 && <p className="p-2 text-sm text-muted-foreground">Aucune catégorie pour ce type.</p>}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-2">
          <Button type="submit">{transactionToEdit ? "Enregistrer les Modifications" : "Ajouter la Transaction"}</Button>
        </div>
      </form>
    </Form>
  );
}
