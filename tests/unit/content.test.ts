import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { careerPageTitle, slugify } from "@/src/modules/careers/careers";
import { categoryFromSlug, categorySlug } from "@/src/modules/news/categories";
import { Markdown, stripMarkdown } from "@/src/modules/news/markdown";
import { cleanNewsSearch } from "@/src/modules/news/search";

const render = (source: string) => renderToStaticMarkup(createElement(Markdown, { source }));

describe("article Markdown", () => {
  it("renders headings, paragraphs and lists", () => {
    const html = render("## What changed\n\nFirst line\ncontinues here.\n\n- one\n- two\n\n1. first\n2. second");
    expect(html).toContain("<h2>What changed</h2>");
    expect(html).toContain("<p>First line continues here.</p>");
    expect(html).toContain("<ul><li>one</li><li>two</li></ul>");
    expect(html).toContain("<ol><li>first</li><li>second</li></ol>");
  });

  it("renders bold, italics and safe external links", () => {
    const html = render("**Bold** and *italic* from [DGCA](https://www.dgca.gov.in)");
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain('<a href="https://www.dgca.gov.in" target="_blank" rel="noopener noreferrer nofollow">DGCA</a>');
  });

  it("never turns raw HTML or javascript: links into markup", () => {
    const html = render("<script>alert(1)</script> [bad](javascript:alert(1))");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('href="javascript');
  });

  it("strips Markdown for meta descriptions", () => {
    expect(stripMarkdown("## Title\n\n**Bold** [link](https://example.com)")).toBe("Title Bold link");
  });
});

describe("news helpers", () => {
  it("maps category slugs both ways", () => {
    expect(categorySlug("dgca_exam_updates")).toBe("dgca-exam-updates");
    expect(categoryFromSlug("dgca-exam-updates")).toBe("dgca_exam_updates");
    expect(categoryFromSlug("not-a-category")).toBeUndefined();
  });

  it("keeps search text safe for database filters", () => {
    expect(cleanNewsSearch("DGCA, exam (2026)%")).toBe("DGCA exam 2026");
    expect(cleanNewsSearch(undefined)).toBe("");
  });
});

describe("careers helpers", () => {
  it("builds URL slugs", () => {
    expect(slugify("Aircraft Maintenance / Engineering")).toBe("aircraft-maintenance-engineering");
    expect(slugify("  Air Traffic Control (ATC) ")).toBe("air-traffic-control-atc");
  });

  it("titles career pages without repeating 'Careers'", () => {
    expect(careerPageTitle("Cabin Crew")).toBe("Cabin Crew Career Guide");
    expect(careerPageTitle("Airline Careers")).toBe("Airline Careers Guide");
  });
});
