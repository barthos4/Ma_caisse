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
import type { Transaction, Category } from "@/types";
import { useTransactions, useCategories } from "@/lib/mock-data";
import { useEffect, useState } from "react";

const transactionFormSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  description: z.string().min(1, "Description is required.").max(100, "Description is too long."),
  amount: z.coerce.number().positive("Amount must be positive."),
  type: z.enum(["income", "expense"], { required_error: "Transaction type is required." }),
  categoryId: z.string().min(1, "Category is required."),
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
          amount: Math.abs(transactionToEdit.amount), // Store as positive for form
        }
      : {
          date: new Date(),
          description: "",
          amount: 0,
          type: "expense",
          categoryId: "",
        },
  });
  
  const transactionType = form.watch("type");

  useEffect(() => {
    const allCategories = getCategories();
    setAvailableCategories(allCategories.filter(c => c.type === transactionType || (transactionType === 'expense' && c.type === 'expense') || (transactionType === 'income' && c.type === 'income')));
    // Reset category if it's not valid for the new type
    const currentCategoryId = form.getValues("categoryId");
    if (currentCategoryId && !allCategories.find(c => c.id === currentCategoryId && c.type === transactionType)) {
        form.setValue("categoryId", "");
    }
  }, [transactionType, getCategories, form]);


  useEffect(() => {
    if (transactionToEdit) {
      form.reset({
        ...transactionToEdit,
        amount: Math.abs(transactionToEdit.amount),
      });
    } else {
      form.reset({
        date: new Date(),
        description: "",
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
    form.reset({ date: new Date(), description: "", amount: 0, type: "expense", categoryId: "" });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
                <Textarea placeholder="e.g., Groceries, Salary" {...field} />
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
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} step="0.01" />
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
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex space-x-4"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="income" />
                    </FormControl>
                    <FormLabel className="font-normal">Income</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="expense" />
                    </FormControl>
                    <FormLabel className="font-normal">Expense</FormLabel>
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
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                  {availableCategories.length === 0 && <p className="p-2 text-sm text-muted-foreground">No categories for this type.</p>}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-2">
          <Button type="submit">{transactionToEdit ? "Save Changes" : "Add Transaction"}</Button>
        </div>
      </form>
    </Form>
  );
}
