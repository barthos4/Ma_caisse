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
import { useTransactions, useCategories } from "@/lib/mock-data";
import { useEffect, useState } from "react";

const transactionFormSchema = z.object({
  orderNumber: z.string().max(50, "Le N° d'ordre ne peut pas dépasser 50 caractères.").optional(),
  date: z.date({ required_error: "Une date est requise." }),
  description: z.string().min(1, "La description est requise.").max(100, "La description est trop longue."),
  reference: z.string().max(50, "La référence ne peut pas dépasser 50 caractères.").optional(),
  amount: z.coerce.number().positive("Le montant doit être positif."),
  type: z.enum(["income", "expense"], { required_error: "Le type de transaction est requis." }),
  categoryId: z.string().min(1, "La catégorie est requise."),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface TransactionFormProps {
  transactionToEdit?: Transaction | null;
  onFormSubmit: () => void;
}

export function TransactionForm({ transactionToEdit, onFormSubmit }: TransactionFormProps) {
  const { addTransaction, updateTransaction } = useTransactions();
  const { getCategories } = useCategories();
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: transactionToEdit
      ? {
          ...transactionToEdit,
          amount: Math.abs(transactionToEdit.amount), 
          orderNumber: transactionToEdit.orderNumber || "",
          reference: transactionToEdit.reference || "",
        }
      : {
          orderNumber: "",
          date: new Date(),
          description: "",
          reference: "",
          amount: 0,
          type: "expense",
          categoryId: "",
        },
  });
  
  const transactionType = form.watch("type");

  useEffect(() => {
    const allCategories = getCategories();
    const filtered = allCategories.filter(c => c.type === transactionType);
    setAvailableCategories(filtered);
    
    const currentCategoryId = form.getValues("categoryId");
    if (currentCategoryId && !filtered.find(c => c.id === currentCategoryId)) {
        form.setValue("categoryId", "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionType, getCategories, form.setValue, form.getValues]);


  useEffect(() => {
    if (transactionToEdit) {
      form.reset({
        ...transactionToEdit,
        amount: Math.abs(transactionToEdit.amount),
        orderNumber: transactionToEdit.orderNumber || "",
        reference: transactionToEdit.reference || "",
      });
    } else {
      form.reset({
        orderNumber: "",
        date: new Date(),
        description: "",
        reference: "",
        amount: 0,
        type: "expense",
        categoryId: "",
      });
    }
  }, [transactionToEdit, form]);

  function onSubmit(data: TransactionFormValues) {
    if (transactionToEdit) {
      updateTransaction(transactionToEdit.id, data);
    } else {
      addTransaction(data);
    }
    onFormSubmit();
    form.reset({ orderNumber: "", date: new Date(), description: "", reference: "", amount: 0, type: "expense", categoryId: "" });
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
                <Input placeholder="ex: 001, A-123" {...field} />
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
                <Input placeholder="ex: Facture #123, Chèque #456" {...field} />
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
              <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une catégorie" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                  {availableCategories.length === 0 && <p className="p-2 text-sm text-muted-foreground">Aucune catégorie pour ce type.</p>}
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
