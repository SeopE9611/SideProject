#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = process.argv.slice(2);
const scanDirs = TARGET_DIRS.length > 0 ? TARGET_DIRS : ['app', 'components', 'lib'];
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mdx']);
const palettes = [
  'slate','gray','zinc','neutral','stone','red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose'
];
const keywords = ['bg', 'text', 'border', 'ring', 'from', 'to', 'via'];

// 일반 UI 금지 규칙
const paletteAlternation = palettes.join('|');
const keywordAlternation = keywords.join('|');
const rawPaletteRegex = new RegExp(`(?:[\\w-]+:)*(?:${keywordAlternation})-(?:${paletteAlternation})-(?:\\d{2,3})(?:\\/\\d{1,3})?`, 'g');
const invertedLabelTextRegex = /(?:^|\s)(?:[\w-]+:)*text-foreground(?:\s|$)[\s\S]*?(?:^|\s)(?:[\w-]+:)*dark:text-muted-foreground(?:\s|$)/;

// 최소 추가 패턴 (중립 하드코딩 클래스)
const hardcodedNeutralRegex = /(?:[\w-]+:)*(?:text-(?:white|black)|bg-(?:white|black)\/\d{1,3}|border-white\/\d{1,3}|ring-black\/\d{1,3}|dark:ring-white\/\d{1,3})/g;
const forbiddenGradientNeutralRegex = /(?:[\w-]+:)*(?:from|via|to)-(?:white|black)(?:\/\d{1,3})?/g;
const forbiddenRingOffsetPaletteRegex = new RegExp(`(?:[\\w-]+:)*ring-offset-(?:${paletteAlternation})-(?:\\d{2,3})`, 'g');
const forbiddenShadowPaletteRegex = new RegExp(`(?:[\\w-]+:)*shadow-(?:${paletteAlternation})-(?:\\d{2,3})(?:\\/\\d{1,3})?`, 'g');
const forbiddenDirectionalBorderPaletteRegex = new RegExp(`(?:[\\w-]+:)*border-(?:t|b|l|r|x|y)-(?:${paletteAlternation})-(?:\\d{2,3})`, 'g');
const classNameBlockRegex = /className\s*=\s*(?:"([^"]*)"|\{`([\s\S]*?)`\})/g;
const zeroGradientBaseRegex = /\bbg-gradient-to-/;
const zeroGradientStopRegex = /(?:^|\s)(?:[\w-]+:)*(?:from|via|to)-/;
const zeroGradientTextRegex = /\bbg-clip-text\b|\btext-transparent\b/;
const zeroGradientArbitraryRegex = /\bbg-\[(?:radial|linear|conic)-gradient/;
const zeroGradientStringRegex = /radial-gradient\(|linear-gradient\(|conic-gradient\(|repeating-linear-gradient\(|repeating-radial-gradient\(/g;
const zeroGradientBackgroundArbitraryRegex = /\[background:[^\]]*gradient\(/g;
const zeroGradientSvgRegex = /<linearGradient|<radialGradient|fill="url\(#/g;
const lowContrastPrimaryRegex = /\bbg-primary(?:\/\d{1,3})?\b[\s\S]*\b(?:text-accent\b|text-primary\b(?!-foreground))/;
const lowContrastGradientRegex = /\bbg-clip-text\b[\s\S]*\btext-transparent\b[\s\S]*\b(?:from-card|to-card|from-primary-foreground|to-primary-foreground)\b/;
const gradientStopRegex = /(?:^|\s)(?:[\w-]+:)*(?:from|via|to)-[\w/[\]-]+(?:\s|$)/;
const gradientBaseRegex = /(?:[\w-]+:)*(?:bg-gradient-to-(?:t|tr|r|br|b|bl|l|tl)|bg-radial|bg-conic)/;
const hoverAccentRegex = /(?:^|\s)(?:[\w-]+:)*hover:bg-accent(?:\/[\d]{1,3})?(?:\s|$)/;
const solidDestructiveWithTextDestructiveRegex = /(?:^|\s)(?:[\w-]+:)*bg-destructive(?!\/)(?:\s|$)[\s\S]*?(?:^|\s)(?:[\w-]+:)*text-destructive(?:\s|$)/;
const primaryTintWithForegroundRegex = /(?:^|\s)(?:[\w-]+:)*bg-primary\/(?:10|15|20)(?:\s|$)[\s\S]*?(?:^|\s)(?:[\w-]+:)*text-primary-foreground(?:\s|$)/;
const warningTintWithForegroundRegex = /(?:^|\s)(?:[\w-]+:)*bg-warning\/(?:10|15|20)(?:\s|$)[\s\S]*?(?:^|\s)(?:[\w-]+:)*text-warning-foreground(?:\s|$)/;
const destructiveTintWithForegroundRegex = /(?:^|\s)(?:[\w-]+:)*bg-destructive\/(?:10|15|20)(?:\s|$)[\s\S]*?(?:^|\s)(?:[\w-]+:)*text-destructive-foreground(?:\s|$)/;
const successTintWithForegroundRegex = /(?:^|\s)(?:[\w-]+:)*bg-success\/(?:10|15|20)(?:\s|$)[\s\S]*?(?:^|\s)(?:[\w-]+:)*text-success-foreground(?:\s|$)/;
const lowContrastMutedCardBackgroundForegroundRegex = /\bbg-(?:muted|card|background)\/\d{1,3}\b(?:\s+[A-Za-z0-9_:[\]/.-]+){0,8}\s+text-primary-foreground\b/;
const solidHoverDestructiveRegex = /(?:^|\s)(?:[\w-]+:)*hover:bg-destructive(?!\/)(?:\s|$)/;
const hoverTextDestructiveRegex = /(?:^|\s)(?:[\w-]+:)*hover:text-destructive(?:\s|$)/;
const solidHoverPrimaryRegex = /(?:^|\s)(?:[\w-]+:)*hover:bg-primary(?!\/)(?:\s|$)/;
const outlineGhostNeutralMutedRegex = /(?:^|\s)(?:[\w-]+:)*(?:variant="(?:outline|ghost|neutral|muted)"|outline|ghost|neutral|muted|badge|chip)(?:\s|$)/i;
const textAccentForegroundRegex = /(?:^|\s)(?:[\w-]+:)*text-accent-foreground(?:\s|$)/;
const bgAccentSolidRegex = /(?:^|\s)(?:[\w-]+:)*bg-accent(?!\/)(?:\s|$)/;
const largePaddingRegex = /(?:^|\s)(?:[\w-]+:)*p-(?:3|4|5|6|7|8|9|10|11|12)(?:\s|$)/;
const accentTintSurfaceRegex = /(?:^|\s)(?:[\w-]+:)*bg-accent\/(?:10|15)(?:\s|$)/;
const textAccentUsageRegex = /(?:^|\s)(?:[\w-]+:)*(?:text-accent|dark:text-accent)(?:\s|$)/;
const buttonLikeRegex = /(?:^|\s)(?:[\w-]+:)*(?:btn|button|variant="(?:destructive|default|secondary|outline|ghost|link)"|size="(?:sm|lg|icon)"|inline-flex)(?:\s|$)/i;
const sliderRangeRegex = /(?:^|\s)(?:[\w-]+:)*slider-range(?:\s|$)/;

const brokenSplitBgTokenRegex = /(?:[\w-]+:)*bg-(?:primary|accent|background|card|muted|foreground)\s+\d(?:\b|\/\d+)/g;
const brokenSplitGradientTokenRegex = /(?:[\w-]+:)*(?:from|via|to)-(?:primary|accent|background|card|muted)\s+\d(?:\b|\/\d+)?/g;
const invalidAccentZeroTokenRegex = /(?:[\w-]+:)*(?:bg|text)-accent0\b/g;
const splitOpacityTokenRegex = /(?:[\w-]+:)*bg-primary\s+\d+\/\d+/g;
const themeColorsClassRegex = /className\s*=\s*(?:"[^"]*theme\(colors\.[^"]*"|\{`[\s\S]*?theme\(colors\.[\s\S]*?`\})/g;
const forbiddenDividePaletteRegex = /(?:[\w-]+:)*divide-(?:gray|slate|zinc|neutral|stone)-(?:\d{2,3})(?:\/\d{1,3})?/g;

const doubleOpacityBgRegex = /(?:[\w-]+:)*bg-[\w[\]-]+\/\d{1,3}\/\d{1,3}/g;
const doubleOpacityHoverBgRegex = /(?:[\w-]+:)*hover:bg-[\w[\]-]+\/\d{1,3}\/\d{1,3}/g;
const doubleOpacityDarkBgRegex = /(?:[\w-]+:)*dark:bg-[\w[\]-]+\/\d{1,3}\/\d{1,3}/g;
const doubleOpacityDarkHoverBgRegex = /(?:[\w-]+:)*dark:hover:bg-[\w[\]-]+\/\d{1,3}\/\d{1,3}/g;
const ringRing500Regex = /(?:[\w-]+:)*ring-ring500\b/g;

// 허용 예외는 명시적으로 분리 관리한다.
const BRAND_EXCEPTION_WHITELIST = new Set([
  'app/login/_components/SocialAuthButtons.tsx',
  'app/login/_components/LoginPageClient.tsx',
  'app/admin/users/_components/UsersClient.tsx',
]);

const NON_WEB_UI_EXCEPTION_WHITELIST = new Set([
  'app/features/notifications/core/render.ts',
]);

const ACCENT_TEXT_WARN_EXCEPTION_WHITELIST = new Set([
  'components/nav/UserNav.tsx',
  'components/nav/UserNavMobile.tsx',
  'components/ui/button.tsx',
]);

function walk(dir, results = []) {
  const absDir = path.join(ROOT, dir);
  if (!fs.existsSync(absDir)) return results;
  for (const ent of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.next' || ent.name === '.git') continue;
    const abs = path.join(absDir, ent.name);
    const rel = path.relative(ROOT, abs).replaceAll('\\', '/');
    if (ent.isDirectory()) {
      walk(rel, results);
    } else if (exts.has(path.extname(ent.name))) {
      results.push(rel);
    }
  }
  return results;
}

function classify(file) {
  const normalized = file.replaceAll('\\', '/');
  if (normalized.startsWith('app/board/')) return 'app/board';
  if (normalized.startsWith('app/rackets/')) return 'app/rackets';
  if (normalized.startsWith('app/mypage/')) return 'app/mypage';
  if (normalized.startsWith('app/admin/')) return 'app/admin';
  if (normalized.startsWith('components/ui/')) return 'components/ui';
  if (normalized.startsWith('app/')) return 'app/others';
  if (normalized.startsWith('components/')) return 'components/others';
  return 'others';
}

function getLine(text, index) {
  return text.slice(0, index).split('\n').length;
}

function getExceptionType(file) {
  if (BRAND_EXCEPTION_WHITELIST.has(file)) return 'brand-whitelist';
  if (NON_WEB_UI_EXCEPTION_WHITELIST.has(file)) return 'non-web-ui';
  return null;
}

const files = scanDirs.flatMap((d) => walk(d));
const grouped = new Map();
let total = 0;
const violations = [];
const warnings = [];
const exceptionMatches = [];
const matchedFiles = new Set();
const exceptionFiles = new Set();

for (const file of files) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const found = [];
  for (const match of text.matchAll(rawPaletteRegex)) {
    found.push({
      type: 'raw-palette-class',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }

  for (const match of text.matchAll(hardcodedNeutralRegex)) {
    found.push({
      type: 'hardcoded-neutral-class',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }

  for (const match of text.matchAll(forbiddenGradientNeutralRegex)) {
    found.push({
      type: 'forbidden-gradient-neutral-class',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }

  for (const match of text.matchAll(forbiddenRingOffsetPaletteRegex)) {
    found.push({
      type: 'forbidden-ring-offset-palette-class',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }

  for (const match of text.matchAll(forbiddenShadowPaletteRegex)) {
    found.push({
      type: 'forbidden-shadow-palette-class',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }

  for (const match of text.matchAll(forbiddenDirectionalBorderPaletteRegex)) {
    found.push({
      type: 'forbidden-directional-border-palette-class',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }


  for (const match of text.matchAll(forbiddenDividePaletteRegex)) {
    found.push({
      type: 'forbidden-divide-palette-class',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }

  for (const match of text.matchAll(themeColorsClassRegex)) {
    found.push({
      type: 'theme-colors-in-classname',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }



  for (const match of text.matchAll(brokenSplitBgTokenRegex)) {
    found.push({
      type: 'broken-split-bg-token-class',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }

  for (const match of text.matchAll(brokenSplitGradientTokenRegex)) {
    found.push({
      type: 'broken-split-gradient-token-class',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }

  for (const match of text.matchAll(invalidAccentZeroTokenRegex)) {
    found.push({
      type: 'invalid-accent-zero-token-class',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }

  for (const match of text.matchAll(splitOpacityTokenRegex)) {
    found.push({
      type: 'split-opacity-token-class',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }


  for (const match of text.matchAll(doubleOpacityBgRegex)) {
    found.push({
      type: 'double-opacity-bg-class',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }

  for (const match of text.matchAll(doubleOpacityHoverBgRegex)) {
    found.push({
      type: 'double-opacity-hover-bg-class',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }

  for (const match of text.matchAll(doubleOpacityDarkBgRegex)) {
    found.push({
      type: 'double-opacity-dark-bg-class',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }

  for (const match of text.matchAll(doubleOpacityDarkHoverBgRegex)) {
    found.push({
      type: 'double-opacity-dark-hover-bg-class',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }

  for (const match of text.matchAll(ringRing500Regex)) {
    found.push({
      type: 'ring-ring500-class',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }

  for (const match of text.matchAll(zeroGradientStringRegex)) {
    found.push({
      type: 'zero-gradient-policy-gradient-string',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }

  for (const match of text.matchAll(zeroGradientBackgroundArbitraryRegex)) {
    found.push({
      type: 'zero-gradient-policy-background-arbitrary-gradient',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }

  for (const match of text.matchAll(classNameBlockRegex)) {
    const block = (match[1] ?? match[2] ?? '').replace(/\s+/g, ' ').trim();
    if (!block) continue;

    if (gradientStopRegex.test(block) && !gradientBaseRegex.test(block)) {
      found.push({
        type: 'gradient-stop-without-base',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (zeroGradientBaseRegex.test(block)) {
      found.push({
        type: 'zero-gradient-policy-bg-gradient',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (zeroGradientStopRegex.test(block)) {
      found.push({
        type: 'zero-gradient-policy-gradient-stop',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (zeroGradientTextRegex.test(block)) {
      found.push({
        type: 'zero-gradient-policy-text-gradient',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (zeroGradientArbitraryRegex.test(block)) {
      found.push({
        type: 'zero-gradient-policy-arbitrary-gradient',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (lowContrastPrimaryRegex.test(block)) {
      warnings.push({
        file,
        type: 'low-contrast-class-combo',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (lowContrastGradientRegex.test(block)) {
      warnings.push({
        file,
        type: 'low-contrast-gradient-combo',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (hoverAccentRegex.test(block)) {
      warnings.push({
        file,
        type: 'hover-accent-usage',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (solidDestructiveWithTextDestructiveRegex.test(block)) {
      found.push({
        type: 'solid-destructive-with-text-destructive',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (primaryTintWithForegroundRegex.test(block)) {
      found.push({
        type: 'primary-tint-with-primary-foreground',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (warningTintWithForegroundRegex.test(block)) {
      found.push({
        type: 'warning-tint-with-warning-foreground',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (destructiveTintWithForegroundRegex.test(block)) {
      found.push({
        type: 'destructive-tint-with-destructive-foreground',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (successTintWithForegroundRegex.test(block)) {
      found.push({
        type: 'success-tint-with-success-foreground',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (lowContrastMutedCardBackgroundForegroundRegex.test(block)) {
      found.push({
        type: 'low-contrast-muted-card-background-with-primary-foreground',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (/\bbg-muted\b/.test(block) && /\bdark:bg-primary\b/.test(block)) {
      warnings.push({
        file,
        type: 'semantic-inversion-bg-muted-dark-bg-primary',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (/\bbg-card\b/.test(block) && /\bdark:bg-primary\b/.test(block)) {
      warnings.push({
        file,
        type: 'semantic-inversion-bg-card-dark-bg-primary',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (/\bbg-muted\b/.test(block) && /\bdark:bg-destructive\b/.test(block)) {
      warnings.push({
        file,
        type: 'semantic-inversion-bg-muted-dark-bg-destructive',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (invertedLabelTextRegex.test(block)) {
      warnings.push({
        file,
        type: 'semantic-inversion-text-foreground-dark-text-muted-foreground',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (solidHoverDestructiveRegex.test(block) && hoverTextDestructiveRegex.test(block)) {
      warnings.push({
        file,
        type: 'solid-hover-destructive-with-hover-text-destructive',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (solidHoverPrimaryRegex.test(block) && outlineGhostNeutralMutedRegex.test(block)) {
      warnings.push({
        file,
        type: 'solid-hover-primary-on-outline-ghost-badge',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (textAccentForegroundRegex.test(block) && !bgAccentSolidRegex.test(block)) {
      warnings.push({
        file,
        type: 'text-accent-foreground-without-bg-accent',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (bgAccentSolidRegex.test(block) && largePaddingRegex.test(block)) {
      warnings.push({
        file,
        type: 'large-block-solid-bg-accent',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }


    if (/\banimate-pulse\b/.test(block) && /\bbg-primary(?:\/\d{1,3})?\b/.test(block)) {
      warnings.push({
        file,
        type: 'animate-pulse-with-bg-primary',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (/\banimate-pulse\b/.test(block) && /\bbg-accent(?!\/)\b/.test(block)) {
      warnings.push({
        file,
        type: 'animate-pulse-with-bg-accent',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (/\bbg-destructive(?!\/)\b/.test(block) && !/\btext-destructive-foreground\b/.test(block)) {
      warnings.push({
        file,
        type: 'solid-bg-destructive-without-foreground',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (/\bbg-destructive(?!\/)\b/.test(block) && largePaddingRegex.test(block) && !buttonLikeRegex.test(block)) {
      warnings.push({
        file,
        type: 'large-surface-solid-bg-destructive',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (/\bbg-primary(?!\/)\b/.test(block) && largePaddingRegex.test(block) && !buttonLikeRegex.test(block) && !sliderRangeRegex.test(block)) {
      warnings.push({
        file,
        type: 'large-surface-solid-bg-primary',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (/\bbg-primary(?!\/)\b/.test(block) && /\btext-primary-foreground\b/.test(block) && largePaddingRegex.test(block) && !buttonLikeRegex.test(block) && !sliderRangeRegex.test(block)) {
      warnings.push({
        file,
        type: 'large-surface-solid-bg-primary-with-primary-foreground',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (accentTintSurfaceRegex.test(block) && largePaddingRegex.test(block)) {
      warnings.push({
        file,
        type: 'large-surface-accent-tint',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (textAccentUsageRegex.test(block) && !ACCENT_TEXT_WARN_EXCEPTION_WHITELIST.has(file)) {
      warnings.push({
        file,
        type: 'text-accent-usage',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    if (file === 'components/ui/radio-group.tsx' && /\bbg-accent(?:\/\d{1,3})?\b/.test(block)) {
      warnings.push({
        file,
        type: 'radio-group-solid-bg-accent-regression',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }

    const hasSolidPrimary = /\bbg-primary(?!\/)\b/.test(block);
    const hasPrimaryForeground = /\btext-primary-foreground\b/.test(block);
    const isDotIndicator = /(?:^|\s)(?:w-1|h-1)(?:\s|$)/.test(block);
    if (hasSolidPrimary && !hasPrimaryForeground && !isDotIndicator) {
      warnings.push({
        file,
        type: 'solid-bg-primary-without-foreground',
        token: block,
        line: getLine(text, match.index ?? 0),
      });
    }
  }

  for (const match of text.matchAll(zeroGradientSvgRegex)) {
    found.push({
      type: 'zero-gradient-policy-svg-gradient',
      token: match[0],
      line: getLine(text, match.index ?? 0),
    });
  }

  if (found.length === 0) continue;

  matchedFiles.add(file);
  total += found.length;

  const group = classify(file);
  if (!grouped.has(group)) grouped.set(group, []);
  const counts = new Map();
  for (const issue of found) {
    const key = `${issue.type}:${issue.token}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  grouped.get(group).push({ file, counts });

  const exceptionType = getExceptionType(file);
  if (exceptionType) {
    exceptionFiles.add(file);
    exceptionMatches.push({ file, found, exceptionType });
    continue;
  }

  violations.push({ file, found });
}

const sortedGroups = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
console.log('# color-class scan');
console.log(`- scanned files: ${files.length}`);
console.log(`- total matches: ${total}`);
console.log(`- matched files: ${matchedFiles.size}`);
console.log(`- exception files: ${exceptionFiles.size}`);
console.log('');
for (const [group, items] of sortedGroups) {
  const groupTotal = items.reduce((sum, item) => sum + [...item.counts.values()].reduce((s, n) => s + n, 0), 0);
  console.log(`## ${group} (${groupTotal})`);
  for (const item of items.sort((a, b) => a.file.localeCompare(b.file))) {
    const tokenList = [...item.counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([token, count]) => `${token}×${count}`)
      .join(', ');
    console.log(`- ${item.file}`);
    console.log(`  - ${tokenList}`);
  }
  console.log('');
}

if (exceptionMatches.length > 0) {
  console.warn('ℹ️ 허용 예외 매치');
  for (const entry of exceptionMatches.sort((a, b) => a.file.localeCompare(b.file))) {
    console.warn(`- ${entry.file} (${entry.exceptionType}, ${entry.found.length} hits)`);
  }
  console.warn('');
}


if (warnings.length > 0) {
  console.warn('⚠️ 저대비 조합 감지 (WARN)');
  for (const entry of warnings.slice(0, 50)) {
    console.warn(`- ${entry.file} [${entry.type}] L${entry.line}: ${entry.token}`);
  }
  if (warnings.length > 50) {
    console.warn(`- ...and ${warnings.length - 50} more warnings`);
  }
  console.warn('');
}

if (violations.length > 0) {
  console.error('❌ color-class scan: 금지 패턴이 발견되었습니다.');
  for (const entry of violations.sort((a, b) => a.file.localeCompare(b.file))) {
    console.error(`\n- ${entry.file}`);
    for (const issue of entry.found.slice(0, 10)) {
      console.error(`  - [${issue.type}] L${issue.line}: ${issue.token}`);
    }
    if (entry.found.length > 10) {
      console.error(`  - ...and ${entry.found.length - 10} more`);
    }
  }
  process.exit(1);
}
