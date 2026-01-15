import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useEffect } from 'react';

function TicketModal({ venta, productos, onClose }) {
  
  const convertirNumeroALetras = (num) => {
    const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const diez_y = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    const entero = Math.floor(num);
    const centavos = Math.round((num - entero) * 100);
    const centavosStr = centavos.toString().padStart(2, '0');

    if (entero === 0) return `CERO PESOS ${centavosStr}/100 M.N.`;
    if (entero === 100) return `CIEN PESOS ${centavosStr}/100 M.N.`;

    let letras = '';
    
    if (entero >= 1000) {
      const miles = Math.floor(entero / 1000);
      const resto = entero % 1000;
      if (miles === 1) letras += 'MIL ';
      else letras += convertirNumeroALetras(miles).replace(' PESOS 00/100 M.N.', '') + ' MIL ';
      if (resto > 0) letras += convertirNumeroALetras(resto).replace(' PESOS 00/100 M.N.', '');
    } else {
      let n = entero;
      if (n >= 100) {
        letras += centenas[Math.floor(n / 100)] + ' ';
        n %= 100;
      }
      if (n >= 20) {
        letras += decenas[Math.floor(n / 10)] + (n % 10 > 0 ? ' Y ' : ' ');
        n %= 10;
      } else if (n >= 10) {
        letras += diez_y[n - 10] + ' ';
        n = 0;
      }
      if (n > 0) {
        letras += unidades[n] + ' ';
      }
    }

    return `${letras.trim()} PESOS ${centavosStr}/100 M.N.`;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const imprimirTicket = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [58, 210] 
    });

    const width = doc.internal.pageSize.getWidth();
    const margin = 4;
    const centerX = width / 2;
    let y = 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TLAPALERÍA GAMA', centerX, y, { align: 'center' });
    
    y += 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const directionLines = doc.splitTextToSize('Prol. Av. Juarez 435, El Contadero, 05500, Cuajimalpa de Morelos, CDMX', width - (margin * 2));
    directionLines.forEach(line => {
      doc.text(line, centerX, y, { align: 'center' });
      y += 3;
    });
    y += 3;
    doc.text('--------------------------------------------------', centerX, y, { align: 'center' });

    y += 4;
    doc.text(`Fecha: ${new Date(venta.fecha).toLocaleString()}`, margin, y);
    y += 4;
    doc.text(`Folio: #${venta.id}`, margin, y);
    y += 4;
    doc.text(`Vendedor: ${venta.nombre_vendedor || 'General'}`, margin, y);
    
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Qty', 'Desc', 'Importe']],
      body: productos.map(p => [
        p.cantidad,
        p.descripcion.substring(0, 40),  
        `$${(p.cantidad * Number(p.precio_unitario)).toFixed(2)}`
      ]),
      theme: 'plain',
      styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
      headStyles: { fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 6, halign: 'center' },
        1: { cellWidth: 'auto' }, 
        2: { cellWidth: 12, halign: 'right' }
      },
      margin: { left: margin, right: margin },
    });

    y = doc.lastAutoTable.finalY + 4;
    
    const rightX = width - margin;

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
        
    if (venta.descuento_total && Number(venta.descuento_total) > 0) {
      doc.text(`DESCUENTO: $${Number(venta.descuento_total).toFixed(2)} MXN`, rightX, y, { align: 'right' });
      y += 4;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`TOTAL: $${Number(venta.total).toFixed(2)} MXN`, rightX, y, { align: 'right' });
    
    y += 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    if (venta.forma_pago === 'Efectivo') {
      doc.text(`Efectivo: $${Number(venta.monto_recibido || 0).toFixed(2)}`, rightX, y, { align: 'right' });
      y += 3;
      doc.text(`Cambio: $${Number(venta.cambio || 0).toFixed(2)}`, rightX, y, { align: 'right' });
      y += 4; 
    } else {
      doc.text(`Pago con: ${venta.forma_pago}`, rightX, y, { align: 'right' });
      y += 4;
    }

    doc.setFontSize(6);
    doc.setFont('courier', 'normal'); 
    const totalLetras = convertirNumeroALetras(Number(venta.total));
    const splitLetras = doc.splitTextToSize(`(${totalLetras})`, width - (margin * 2));
    doc.text(splitLetras, centerX, y, { align: 'center' });
    
    y += (splitLetras.length * 3) + 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('¡Gracias por su compra!', centerX, y, { align: 'center' });
    y += 4;
    doc.setFontSize(7);
    doc.text('Solicita tu factura al siguiente número: ', centerX, y, { align: 'center' });
    y += 3;
    doc.text('55-6970-0587', centerX, y, { align: 'center' });
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = pdfUrl;
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(pdfUrl);
      }, 1000);
    };
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh]">
        
        {/* Header Visual */}
        <div className="bg-emerald-500 p-6 rounded-t-2xl text-center text-white">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
             <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold">¡Venta Exitosa!</h2>
          <p className="text-emerald-100 text-sm mt-1">La transacción se guardó correctamente</p>
        </div>

        {/* Resumen */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
             <span className="text-slate-500">Total Pagado</span>
             <span className="text-2xl font-bold text-slate-800">${Number(venta.total).toFixed(2)}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
             <div>
                <p className="text-slate-400 text-xs uppercase font-bold">Cambio</p>
                <p className="font-semibold text-slate-700">${Number(venta.cambio || 0).toFixed(2)}</p>
             </div>
             <div>
                <p className="text-slate-400 text-xs uppercase font-bold">Método</p>
                <p className="font-semibold text-slate-700">{venta.forma_pago}</p>
             </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 border border-slate-100">
             <p className="mb-1"><strong>Ticket ID:</strong> #{venta.id}</p>
             <p><strong>Fecha:</strong> {new Date(venta.fecha).toLocaleString()}</p>
              <p><strong>Productos:</strong></p>
              <ul className="list-disc list-inside max-h-32 overflow-y-auto">
                {productos.map((p, index) => (
                  <li key={index}>
                    {p.cantidad} x {p.descripcion} @ ${Number(p.precio_unitario).toFixed(2)} = ${ (p.cantidad * Number(p.precio_unitario)).toFixed(2)}
                  </li>
                ))}
              </ul>
          </div>
        </div>

        {/* Acciones */}
        <div className="p-4 border-t border-slate-100 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
          >
            Cerrar
          </button>
          <button
            onClick={imprimirTicket}
            className="px-4 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900 shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
          >
            <span>🖨️</span> Imprimir Ticket
          </button>
        </div>

      </div>
    </div>
  );
}

export default TicketModal;