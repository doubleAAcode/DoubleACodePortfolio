import type { CSSProperties, ReactNode } from "react";
import logoAsset from "@/assets/aa-logo-optimized.png";
import {
  accentColors,
  computeTotals,
  formatDate,
  formatMoney,
  TYPE_META,
  type DocState,
  type LangMode,
  type Seller,
} from "@/lib/documents/model";
import { amountInWords } from "@/lib/documents/number-words";

export const DOCUMENT_CSS = `
.dp-paper { --a:#6d28d9; --b:#ff1493; --c:#ff8c42; position:relative; background:#fff; color:#17141f;
  font-family:'Segoe UI',Tahoma,'Noto Sans Arabic',Arial,sans-serif; font-size:10.5pt; line-height:1.4;
  display:flex; flex-direction:column; padding:14mm 15mm 16mm; overflow:hidden;
  -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.dp-paper[data-paper="a4"] { width:210mm; min-height:296mm; }
.dp-paper[data-paper="letter"] { width:215.9mm; min-height:278mm; }
.dp-paper * { box-sizing:border-box; }
.dp-grad { background:linear-gradient(90deg,var(--a),var(--b) 55%,var(--c)); }
.dp-topbar { position:absolute; left:0; right:0; top:0; height:7mm; }
.dp-botbar { position:absolute; left:0; right:0; bottom:0; height:3mm; }
.dp-head { display:flex; align-items:center; justify-content:space-between; gap:6mm; margin-top:5mm; }
.dp-brand { display:flex; align-items:center; gap:3mm; min-width:0; }
.dp-brand img { width:27mm; height:27mm; object-fit:contain; margin:-3mm; flex:none; }
.dp-brand .n { font-weight:700; font-size:16pt; letter-spacing:.02em; }
.dp-brand .t { font-size:8.5pt; color:#6b6678; margin-top:.5mm; }
.dp-title { text-align:right; }
.dp-title .en { font-size:20pt; font-weight:700; letter-spacing:-.01em; line-height:1.15; }
.dp-title .ar { font-size:21pt; font-weight:700; direction:rtl; color:var(--b); line-height:1.25; }
.dp-meta { display:grid; gap:4mm; margin-top:7mm; }
.dp-box { border:.3mm solid #e5e1ee; border-radius:3mm; padding:2.2mm 4mm; display:flex; flex-direction:column; gap:.8mm; min-width:0; }
.dp-box .labs { display:flex; justify-content:space-between; gap:3mm; }
.dp-box .dp-val { overflow-wrap:anywhere; }
.dp-lab { font-size:7.8pt; text-transform:uppercase; letter-spacing:.12em; color:#6b6678; font-weight:600; }
.dp-lab-ar { font-size:9.5pt; color:#6b6678; font-weight:600; direction:rtl; }
.dp-val { font-size:10.5pt; font-weight:600; }
.dp-banner { margin-top:6mm; border-radius:4mm; padding:5mm 7mm; color:#fff; display:flex; align-items:center; justify-content:space-between; gap:4mm; background:linear-gradient(120deg,var(--a),var(--b) 62%,var(--c)); }
.dp-banner .l { font-size:8.5pt; text-transform:uppercase; letter-spacing:.16em; opacity:.92; font-weight:600; }
.dp-banner .la { font-size:11.5pt; font-weight:700; margin-top:.5mm; direction:rtl; }
.dp-banner .num { font-size:30pt; font-weight:700; letter-spacing:-.02em; line-height:1.1; }
.dp-stamp { border:.6mm solid #fff; border-radius:3mm; padding:2mm 4.5mm; text-align:center; transform:rotate(-4deg); }
.dp-stamp b { display:block; font-size:11pt; letter-spacing:.14em; }
.dp-stamp span { font-size:11.5pt; font-weight:700; }
.dp-card { margin-top:6mm; border:.3mm solid #e5e1ee; border-radius:4mm; overflow:hidden; }
.dp-row { display:grid; }
.dp-row + .dp-row { border-top:.3mm solid #e5e1ee; }
.dp-row.two { grid-template-columns:1fr 1fr; }
.dp-cell { padding:3mm 5.5mm; min-width:0; }
.dp-cell.ar { direction:rtl; text-align:right; background:#faf9fd; }
.dp-row.two .dp-cell.ar { border-left:.3mm solid #e5e1ee; }
.dp-cell .dp-lab, .dp-cell .dp-lab-ar { display:block; margin-bottom:1mm; }
.dp-sub { font-size:8.8pt; color:#4a4558; margin-top:.8mm; overflow-wrap:anywhere; }
.dp-words { font-size:10pt; font-weight:500; line-height:1.45; }
.dp-table { margin-top:6mm; width:100%; border-collapse:collapse; border:.3mm solid #e5e1ee; border-radius:4mm; overflow:hidden; }
.dp-table th { background:#faf9fd; font-size:7.8pt; text-transform:uppercase; letter-spacing:.1em; color:#6b6678; font-weight:600; padding:2.4mm 3mm; text-align:left; }
.dp-table td { padding:2.6mm 3mm; border-top:.3mm solid #e5e1ee; vertical-align:top; }
.dp-table .r { text-align:right; white-space:nowrap; }
.dp-table .ar { direction:rtl; text-align:right; color:#4a4558; margin-top:.6mm; }
.dp-totals { margin:4mm 0 0 auto; width:78mm; font-size:10pt; }
.dp-totals div { display:flex; justify-content:space-between; gap:4mm; padding:1.2mm 0; }
.dp-totals .grand { border-top:.5mm solid #17141f; margin-top:1mm; padding-top:2.4mm; font-size:12pt; font-weight:700; }
.dp-note { margin-top:6mm; border-radius:4mm; background:#f1fbf4; border:.35mm solid #8fd3a4; padding:4mm 5.5mm; display:grid; gap:5mm; }
.dp-note.two { grid-template-columns:1fr 1fr; }
.dp-note small { display:block; font-size:7.8pt; letter-spacing:.14em; text-transform:uppercase; color:#2f7a4a; margin-bottom:1mm; font-weight:700; }
.dp-note .ar { direction:rtl; text-align:right; font-weight:700; font-size:11pt; line-height:1.55; }
.dp-note .ar small { font-size:9.5pt; letter-spacing:0; text-transform:none; }
.dp-note .en { font-weight:600; font-size:10pt; line-height:1.5; }
.dp-terms { margin-top:5mm; font-size:8.8pt; color:#4a4558; display:grid; gap:2mm; }
.dp-terms.two { grid-template-columns:1fr 1fr; gap:6mm; }
.dp-terms .ar { direction:rtl; text-align:right; }
.dp-sign { margin-top:12mm; display:grid; grid-template-columns:1fr 1fr; gap:14mm; }
.dp-sign .line { border-top:.3mm solid #17141f; padding-top:1.8mm; display:flex; justify-content:space-between; gap:3mm; font-size:8.8pt; color:#4a4558; }
.dp-sign .line .ar { direction:rtl; }
.dp-stamp-solo { align-self:flex-end; margin-top:5mm; border:.6mm solid var(--b); color:var(--b); border-radius:3mm; padding:2mm 5mm; text-align:center; transform:rotate(-4deg); }
.dp-stamp-solo b { display:block; font-size:11pt; letter-spacing:.14em; }
.dp-stamp-solo span { font-size:11.5pt; font-weight:700; }
.dp-spacer { flex:1 1 auto; min-height:8mm; }
.dp-foot { text-align:center; font-size:8.3pt; color:#6b6678; line-height:1.6; padding-top:4mm; }
.dp-foot .thanks { font-weight:600; color:#17141f; font-size:9.5pt; }
@media print {
  html, body { background:#fff !important; }
  body * { visibility:hidden; }
  .dp-print-root, .dp-print-root * { visibility:visible; }
  .dp-print-root { position:absolute; left:0; top:0; width:auto !important; height:auto !important; }
  .dp-scale { transform:none !important; height:auto !important; width:auto !important; }
}
`;

type Props = { doc: DocState; seller: Seller };

export function DocumentPreview({ doc, seller }: Props) {
  const meta = TYPE_META[doc.type];
  const totals = computeTotals(doc);
  const [a, b, c] = accentColors(doc);
  const logo = doc.logoDataUrl || logoAsset;
  const words = amountInWords(doc.type === "receipt" ? totals.due : totals.total, doc.currency);
  const wordsEn = doc.wordsEn.trim() || words.en;
  const wordsAr = doc.wordsAr.trim() || words.ar;
  const lang = doc.lang;
  const both = lang === "both";
  const showEn = lang !== "ar";
  const showAr = lang !== "en";
  const amountLabelEn = doc.type === "receipt" ? "Amount received" : doc.type === "invoice" ? "Total due" : "Estimated total";
  const amountLabelAr = doc.type === "receipt" ? "المبلغ المستلم" : doc.type === "invoice" ? "المبلغ المستحق" : "إجمالي العرض";
  const bannerAmount = doc.type === "receipt" ? totals.due : totals.total;
  const secondDate = doc.type === "invoice" ? ["Due date", "تاريخ الاستحقاق"] : ["Valid until", "صالح حتى"];
  const hasSecondDate = doc.type !== "receipt" && Boolean(doc.dueDate);
  const clientName = (language: "en" | "ar") =>
    language === "en" ? doc.clientEn || doc.clientAr : doc.clientAr || doc.clientEn;
  const contactLines = [doc.clientPhone, doc.clientEmail, doc.clientAddress].filter(Boolean);
  const itemsVisible = doc.show.items && doc.items.length > 0;
  const paymentFor = (language: "en" | "ar") =>
    language === "en" ? doc.paymentForEn || doc.paymentForAr : doc.paymentForAr || doc.paymentForEn;

  const style = { "--a": a, "--b": b, "--c": c } as CSSProperties;

  return (
    <div className="dp-paper" data-paper={doc.paper} style={style}>
      <div className="dp-topbar dp-grad" />

      <div className="dp-head" style={lang === "ar" ? { direction: "rtl" } : undefined}>
        <div className="dp-brand">
          {doc.show.logo ? <img src={logo} alt="" /> : null}
          <div>
            <div className="n">{seller.name}</div>
            {showEn && seller.taglineEn ? <div className="t">{seller.taglineEn}</div> : null}
            {!showEn && seller.taglineAr ? <div className="t" style={{ direction: "rtl" }}>{seller.taglineAr}</div> : null}
          </div>
        </div>
        <div className="dp-title" style={lang === "ar" ? { textAlign: "left" } : undefined}>
          {showEn ? <div className="en">{meta.en}</div> : null}
          {showAr ? <div className="ar">{meta.ar}</div> : null}
        </div>
      </div>

      <div className="dp-meta" style={{ gridTemplateColumns: hasSecondDate ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))" }}>
        <MetaBox lang={lang} en="No." ar="الرقم" value={doc.number} />
        <MetaBox lang={lang} en="Date" ar="التاريخ" value={formatDate(doc.date, showEn ? "en" : "ar")} />
        {hasSecondDate ? (
          <MetaBox lang={lang} en={secondDate[0]} ar={secondDate[1]} value={formatDate(doc.dueDate, showEn ? "en" : "ar")} />
        ) : null}
      </div>

      {doc.show.banner ? (
        <div className="dp-banner">
          <div>
            {showEn ? <div className="l">{amountLabelEn}</div> : null}
            {showAr ? <div className="la" style={showEn ? undefined : { marginTop: 0 }}>{amountLabelAr}</div> : null}
          </div>
          <div className="num">{formatMoney(bannerAmount, doc.currency)}</div>
          {doc.show.stamp ? (
            <div className="dp-stamp">
              {showEn ? <b>{doc.stampEn}</b> : null}
              {showAr ? <span>{doc.stampAr}</span> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {!doc.show.banner && doc.show.stamp ? (
        <div className="dp-stamp-solo">
          {showEn ? <b>{doc.stampEn}</b> : null}
          {showAr ? <span>{doc.stampAr}</span> : null}
        </div>
      ) : null}

      <div className="dp-card">
        <DetailRow lang={lang} labelEn={meta.clientEn} labelAr={meta.clientAr}
          valueEn={clientName("en") || "—"} valueAr={clientName("ar") || "—"}
          extra={contactLines} />
        <DetailRow lang={lang} labelEn={meta.sellerEn} labelAr={meta.sellerAr} valueEn={seller.name} valueAr={seller.name} />
        {doc.type === "receipt" && !itemsVisible && (doc.paymentForEn || doc.paymentForAr) ? (
          <DetailRow lang={lang} labelEn="Payment for" labelAr="وذلك عن" valueEn={paymentFor("en")} valueAr={paymentFor("ar")} />
        ) : null}
        {doc.show.paymentMethod && doc.paymentMethod ? (
          <DetailRow lang={lang} labelEn="Payment method" labelAr="طريقة الدفع" valueEn={doc.paymentMethod} valueAr={doc.paymentMethod} />
        ) : null}
        {doc.show.words ? (
          <DetailRow lang={lang} labelEn="Amount in words" labelAr="المبلغ كتابةً" valueEn={wordsEn} valueAr={wordsAr} words />
        ) : null}
        {doc.type === "receipt" && doc.show.balance && doc.projectTotal > 0 ? (
          <>
            <DetailRow lang={lang} labelEn="Total agreed" labelAr="إجمالي المبلغ المتفق عليه"
              valueEn={formatMoney(doc.projectTotal, doc.currency)} valueAr={formatMoney(doc.projectTotal, doc.currency)} />
            <DetailRow lang={lang} labelEn="Balance remaining" labelAr="الرصيد المتبقي"
              valueEn={formatMoney(totals.balance, doc.currency)} valueAr={formatMoney(totals.balance, doc.currency)} />
          </>
        ) : null}
      </div>

      {itemsVisible ? (
        <>
          <table className="dp-table">
            <thead>
              <tr>
                <th style={{ width: "7mm" }}>#</th>
                <th>{showEn ? "Description" : ""}{both ? " · " : ""}{showAr ? "الوصف" : ""}</th>
                <th className="r">{showEn ? "Qty" : "الكمية"}</th>
                <th className="r">{showEn ? "Unit price" : "السعر"}</th>
                <th className="r">{showEn ? "Amount" : "المبلغ"}</th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>
                    {showEn && (item.descEn || (!showAr && item.descAr)) ? <div>{item.descEn || item.descAr}</div> : null}
                    {showAr && (item.descAr || (!showEn && item.descEn)) ? (
                      <div className={showEn ? "ar" : ""} style={showEn ? undefined : { direction: "rtl", textAlign: "right" }}>
                        {item.descAr || item.descEn}
                      </div>
                    ) : null}
                  </td>
                  <td className="r">{item.qty}</td>
                  <td className="r">{formatMoney(item.price, doc.currency)}</td>
                  <td className="r">{formatMoney((Number(item.qty) || 0) * (Number(item.price) || 0), doc.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="dp-totals">
            <div><span>{both ? "Subtotal · المجموع" : showEn ? "Subtotal" : "المجموع"}</span><span>{formatMoney(totals.subtotal, doc.currency)}</span></div>
            {totals.discount > 0 ? (
              <div><span>{both ? `Discount ${doc.discountPct}% · خصم` : showEn ? `Discount ${doc.discountPct}%` : `خصم ${doc.discountPct}%`}</span><span>-{formatMoney(totals.discount, doc.currency)}</span></div>
            ) : null}
            {totals.tax > 0 ? (
              <div><span>{both ? `Tax ${doc.taxPct}% · ضريبة` : showEn ? `Tax ${doc.taxPct}%` : `ضريبة ${doc.taxPct}%`}</span><span>{formatMoney(totals.tax, doc.currency)}</span></div>
            ) : null}
            <div className="grand"><span>{both ? "Total · الإجمالي" : showEn ? "Total" : "الإجمالي"}</span><span>{formatMoney(totals.total, doc.currency)}</span></div>
          </div>
        </>
      ) : null}

      {doc.show.note && (doc.noteEn.trim() || doc.noteAr.trim()) ? (
        <div className={`dp-note${both ? " two" : ""}`}>
          {showEn ? <div className="en"><small>Note</small>{doc.noteEn}</div> : null}
          {showAr ? <div className="ar"><small>ملاحظة</small>{doc.noteAr}</div> : null}
        </div>
      ) : null}

      {doc.show.terms && (doc.termsEn.trim() || doc.termsAr.trim()) ? (
        <div className={`dp-terms${both ? " two" : ""}`}>
          {showEn ? <div>{doc.termsEn}</div> : null}
          {showAr ? <div className="ar">{doc.termsAr}</div> : null}
        </div>
      ) : null}

      {doc.show.signature ? (
        <div className="dp-sign">
          <div className="line">
            {showEn ? <span>{`${meta.sellerEn} (${seller.name})`}</span> : <span />}
            {showAr ? <span className="ar">{meta.sellerAr}</span> : null}
          </div>
          <div className="line">
            {showEn ? <span>Signature / stamp</span> : <span />}
            {showAr ? <span className="ar">التوقيع / الختم</span> : null}
          </div>
        </div>
      ) : null}

      <div className="dp-spacer" />

      {doc.show.footer ? (
        <div className="dp-foot">
          <div className="thanks">
            {showEn ? "Thank you for your business" : ""}
            {both ? " · " : ""}
            {showAr ? "شكراً لتعاملكم معنا" : ""}
          </div>
          {[seller.email, seller.phones, seller.website].filter(Boolean).join("  ·  ")}
        </div>
      ) : null}

      <div className="dp-botbar dp-grad" />
    </div>
  );
}

function MetaBox({ lang, en, ar, value }: { lang: LangMode; en: string; ar: string; value: string }) {
  return (
    <div className="dp-box" style={lang === "ar" ? { direction: "rtl" } : undefined}>
      <div className="labs">
        {lang !== "ar" ? <span className="dp-lab">{en}</span> : null}
        {lang !== "en" ? <span className="dp-lab-ar">{ar}</span> : null}
      </div>
      <span className="dp-val">{value}</span>
    </div>
  );
}

function DetailRow({
  lang,
  labelEn,
  labelAr,
  valueEn,
  valueAr,
  extra,
  words,
}: {
  lang: LangMode;
  labelEn: string;
  labelAr: string;
  valueEn: string;
  valueAr: string;
  extra?: string[];
  words?: boolean;
}) {
  const cellValue = (value: string, ar: boolean): ReactNode => (
    <>
      <span className={words ? "dp-words" : "dp-val"}>{value}</span>
      {extra && extra.length ? (
        <div className="dp-sub" style={ar ? { direction: "rtl" } : undefined}>
          {extra.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      ) : null}
    </>
  );

  if (lang === "both") {
    return (
      <div className="dp-row two">
        <div className="dp-cell">
          <span className="dp-lab">{labelEn}</span>
          {cellValue(valueEn, false)}
        </div>
        <div className="dp-cell ar">
          <span className="dp-lab-ar">{labelAr}</span>
          {cellValue(valueAr, true)}
        </div>
      </div>
    );
  }

  const ar = lang === "ar";
  return (
    <div className="dp-row">
      <div className={`dp-cell${ar ? " ar" : ""}`}>
        <span className={ar ? "dp-lab-ar" : "dp-lab"}>{ar ? labelAr : labelEn}</span>
        {cellValue(ar ? valueAr : valueEn, ar)}
      </div>
    </div>
  );
}
