import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";

const FAQPage = () => {
  const { copy } = usePresence();

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={copy.faqPage.title} body={copy.faqPage.body} />
        <Accordion type="single" collapsible className="w-full space-y-2">
          {copy.faq.map((item, index) => (
            <AccordionItem
              key={item.question}
              value={`faq-${index}`}
              className="rounded-[22px] border border-white/10 bg-black/20 px-4"
            >
              <AccordionTrigger className="text-left text-sm text-white hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-6 text-white/65">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Surface>
    </PageShell>
  );
};

export default FAQPage;
