import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ShoppingList, ShoppingListItem } from "@/hooks/use-shopping";
import { formatPrice } from "@/lib/utils";

export function generateShoppingListPDF(list: ShoppingList) {
  const doc = new jsPDF();
  
  const checkedItems = list.items.filter(item => item.checked);
  const total = checkedItems.reduce((acc, item) => acc + (item.price ? item.price * item.units : 0), 0);

  // Colores y diseño base
  const primaryColor: [number, number, number] = [124, 58, 237]; // violet-600
  
  // Título principal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Super Scanner", 14, 20);
  
  // Subtítulo (Nombre de la lista y Fecha)
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text(list.name, 14, 30);
  
  const dateStr = list.createdAt ? format(list.createdAt.toDate ? list.createdAt.toDate() : new Date(list.createdAt), "dd 'de' MMMM, yyyy", { locale: es }) : format(new Date(), "dd 'de' MMMM, yyyy", { locale: es });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${dateStr}`, 14, 36);

  if (checkedItems.length === 0) {
    doc.setFontSize(12);
    doc.text("No se compró ningún artículo en esta lista.", 14, 50);
    doc.save(`super-scanner-${list.name}.pdf`);
    return;
  }

  // Preparar datos para la tabla
  const tableData = checkedItems.map((item, index) => [
    index + 1,
    item.name + (item.brand ? ` (${item.brand})` : ""),
    item.quantity || "-",
    item.units.toString(),
    item.price ? formatPrice(item.price) : "-",
    item.price ? formatPrice(item.price * item.units) : "-"
  ]);

  autoTable(doc, {
    startY: 45,
    head: [["#", "Producto", "Peso/Vol", "Cant.", "Precio Unit.", "Subtotal"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' }
    }
  });

  // @ts-ignore
  const finalY = doc.lastAutoTable.finalY || 45;

  // Total Final
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`Total Comprado: ${formatPrice(total)}`, 14, finalY + 15);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.text("Generado por Super Scanner App", 14, doc.internal.pageSize.getHeight() - 10);

  // Descargar
  doc.save(`compra-${list.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
}
