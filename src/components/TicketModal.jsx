import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function TicketModal({ venta, productos, onClose }) {
  const totalEnLetras = (num) => {
    const unidades = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const decenasCompuestas = ['veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const centenas = ['cien', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
    if (num === 0) return 'cero';
    if (num < 10) return unidades[num];
    if (num < 20) return decenas[num - 10];
    if (num < 100) {
      const unidad = num % 10;
      const decena = Math.floor(num / 10);
      return decena === 2 && unidad > 0 ? `veinti${unidades[unidad]}` : `${decenasCompuestas[decena - 2]}${unidad > 0 ? ' y ' + unidades[unidad] : ''}`;
    }
    if (num < 1000) {
      const centena = Math.floor(num / 100);
      const resto = num % 100;
      return `${centenas[centena - 1]}${resto > 0 ? ' ' + totalEnLetras(resto) : ''}`;
    }
    if (num < 10000) {
      const millar = Math.floor(num / 1000);
      const resto = num % 1000;
      return `${millar === 1 ? 'mil' : unidades[millar] + ' mil'}${resto > 0 ? ' ' + totalEnLetras(resto) : ''}`;
    }
    return num.toString();
  };

  const generarPDF = () => {
    // Adapted ticket generator using jsPDF + autoTable
    const PAPER_WIDTH = 58;
    const PAPER_HEIGHT = 200;
    const MARGIN = 4;
    const CENTER_X = PAPER_WIDTH / 2;
    const RIGHT_X = PAPER_WIDTH - MARGIN;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PAPER_WIDTH, PAPER_HEIGHT] });

    const data = {
      date: new Date(venta.fecha).toLocaleString(),
      saleId: String(venta.id || ''),
      items: (productos || []).map(p => ({ quantity: p.cantidad, name: p.descripcion, price: Number(p.precio_unitario) || 0 })),
      total: Number(venta.total) || 0
    };
    y = 2;
    doc.setFontSize(12);
    doc.setFont('arial', 'bold');
    doc.text('CLIMAS GAMA', CENTER_X, y, { align: 'center' });

    y += 5;
    doc.setFontSize(10);
    doc.setFont('arial', 'normal');

    const address = 'Prol. Juarez #435 2, Contadero, Cuajimalpa de Morelos, C.P. 05500, CDMX';
    
    doc.text(address, CENTER_X, y, { align: 'center' });
    y += 2;

    doc.text('-------------------------------------------', CENTER_X, y, { align: 'center' });

    y += 5;
    doc.text(`Fecha: ${data.date}`, MARGIN, y);
    y += 4;
    doc.text(`ID: ${String(data.saleId).slice(0, 12)}${String(data.saleId).length > 12 ? '...' : ''}`, MARGIN, y);

    y += 3;

    autoTable(doc, {
      startY: y,
      head: [['Cant', 'Prod', 'Total']],
      body: data.items.map(item => [
        item.quantity,
        String(item.name),
        `$${(item.price * item.quantity).toFixed(2)}`
      ]),
      theme: 'plain',
      styles: {
        fontSize: 8,
        cellPadding: 1,
        overflow: 'linebreak',
        valign: 'middle'
      },
      headStyles: {
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 13, halign: 'right' }
      },
      margin: { left: MARGIN, right: MARGIN }
    });

    // lastAutoTable may not exist if there are no items
    y = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 5 : (y + 20);

    const total = Number(data.total) || 0;

    doc.setFontSize(10);
    doc.setFont('arial', 'bold');
    doc.text(`TOTAL: $${total.toFixed(2)}`, RIGHT_X, y, { align: 'right' });

    y += 5;
    doc.setFontSize(10);
    doc.setFont('arial', 'normal');

    const footerText = '¡Gracias por su compra!';
    const maxFooterWidth = PAPER_WIDTH - (MARGIN * 2);
    const footerLines = doc.splitTextToSize(footerText, maxFooterWidth);
    doc.text(footerLines, CENTER_X, y + 5, { align: 'center' });

    y += 3;
    const facturaInfo = 'Solicita tu factura al siguiente numero: ';
    const facturaNum = '5569700587';
    
    doc.text(facturaInfo, CENTER_X, y + 10, { align: 'center' });
    doc.text(facturaNum, CENTER_X, y + 15, { align: 'center' });  

    doc.save(`ticket_${String(data.saleId).slice(0, 6)}.pdf`);
  };



  return (
    // Backdrop con scroll si el contenido crece
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto">
      {/* Contenedor del modal: columna, con header y footer 'sticky' */}
      <div className="relative w-full max-w-md my-6 bg-white border rounded-xl shadow-lg flex flex-col max-h-[90vh]">
        {/* Header fijo */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">🧾 Ticket de Venta #{venta.id}</h2>
            <button
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100"
              aria-label="Cerrar"
            >
              ✖
            </button>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-slate-700">
            <span><strong>Fecha:</strong> {new Date(venta.fecha).toLocaleDateString()}</span>
            <span><strong>Forma de pago:</strong> {venta.forma_pago}</span>
            <span><strong>Vendedor:</strong> {venta.nombre_vendedor}</span>
          </div>
        </div>

        {/* Cuerpo scrollable */}
        <div className="px-6 py-3 overflow-y-auto">
          <ul className="text-sm divide-y">
            {productos.map((p, i) => (
              <li key={i} className="py-2">
                <div className="font-medium">{p.descripcion}</div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Cant: {p.cantidad}</span>
                  <span>P.Unit: ${p.precio_unitario}</span>
                  <span>Subt: ${(p.cantidad * p.precio_unitario).toFixed(2)}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t mt-3 pt-3 text-right">
            <p className="font-bold text-lg text-blue-700">Total: ${venta.total}</p>
          </div>
        </div>

        {/* Footer fijo con botones */}
        <div className="sticky bottom-0 z-10 bg-white border-t px-6 py-3 flex items-center justify-between">
          <button
            onClick={generarPDF}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            Exportar PDF
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-slate-600 text-white text-sm font-medium hover:bg-slate-700 transition"
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}

export default TicketModal;
