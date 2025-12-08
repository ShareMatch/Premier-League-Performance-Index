# ShareMatch Developer Design System

> [!IMPORTANT]
> **This is the Source of Truth.** Cursor must follow these rules strictly.
> Do not invent new patterns. Do not deduce styles from context. USE THE TOKENS.

---

## 1. Required Rules for All Code Generation

1.  **Strict Token Usage**: Always use `brand.*` tokens. Never use hex codes for brand colors (e.g., `#064e3b`).
2.  **Typography**: Always use `Inter` via `font-sans`. **Playfair Display is FORBIDDEN**.
3.  **Component Primacy**: Always use the patterns defined in Section 3.
4.  **Radius Rules**:
    *   **Buttons/Inputs**: `rounded-full`
    *   **Cards**: `rounded-xl`
    *   **Modals**: `rounded-modal` (`40px`)
5.  **Layout**:
    *   Main Container: `max-w-7xl mx-auto`
    *   Section Spacing: `gap-6` (unless densely packed)
6.  **No Inline Styles**: Never use `style={{ ... }}` except for dynamic animation values.
7.  **No Arbitrary Tailwind**: Avoid `bg-[#E5E5E5]`. Use `bg-gray-200`.

---

## 2. Canonical Design Tokens

These tokens are configured in `tailwind.config.js`. You MUST use the Class Name.

### Colors
| Token Name | Class Name | Hex (Reference Only) | Usage |
| :--- | :--- | :--- | :--- |
| **Emerald 900** | `bg-brand-emerald900` | `#064e3b` | Primary Themes, Navbars |
| **Emerald 500** | `bg-brand-emerald500` | `#10b981` | Brand Highlights, Active States |
| **Cream** | `bg-brand-cream` | `#FDFBF7` | Light Backgrounds |
| **Amber 500** | `bg-brand-amber500` | `#f59e0b` | Accents |
| **Gray 200** | `bg-gray-200` | `#E5E5E5` | **Input Backgrounds Only** |
| **Gray 900** | `bg-gray-900` | `#111827` | Primary Dark Text |

### Structure
| Token | Class | Value | Usage |
| :--- | :--- | :--- | :--- |
| **Radius Full** | `rounded-full` | `9999px` | Buttons, Inputs, Badges |
| **Radius XL** | `rounded-xl` | `1rem` | Cards, Panels |
| **Radius Modal** | `rounded-modal` | `40px` | Modals, Large Overlays |
| **Shadow Card** | `shadow-card` | `0 1px 3px` | Standard Cards |
| **Shadow Heavy** | `shadow-heavy` | `0 4px 12px` | Modals, Dropdowns |

---

## 3. Component Catalogue

### Navigation Bar
*   **Height**: `h-16`
*   **Theme**: `bg-brand-emerald900` (Dark) or `bg-brand-cream` (Light)
*   **Layout**: Logo left, Links right.
```tsx
<nav className="h-16 bg-brand-emerald900 w-full flex items-center justify-between px-6">
  <div className="flex items-center gap-2">
    {/* Logo */}
    <span className="text-white font-bold text-xl">ShareMatch</span>
  </div>
  <div className="hidden md:flex items-center gap-6">
     <a href="#" className="text-gray-300 hover:text-white transition-colors">Vision</a>
     <a href="#" className="text-gray-300 hover:text-white transition-colors">Tech</a>
  </div>
</nav>
```

### Buttons
*   **Primary**: Gradient background, white text.
*   **Secondary**: Outline emerald.
```tsx
// Primary
<button className="rounded-full bg-gradient-primary text-white font-medium px-6 py-3 shadow-lg hover:shadow-xl transition-all">
  Action
</button>

// Secondary
<button className="rounded-full border border-brand-emerald500 text-brand-emerald500 hover:bg-brand-emerald500/10 px-6 py-3 transition-colors">
  Cancel
</button>
```

### Inputs & Forms
*   **Background**: `bg-gray-200` (This is strict).
*   **Layout**: `flex flex-col gap-2` for groups.
```tsx
<div className="flex flex-col gap-2">
  <label className="text-sm font-medium text-gray-900 ml-1">Email</label>
  <div className="bg-gray-200 rounded-full px-5 py-3 flex items-center shadow-inner">
    <input 
      className="bg-transparent w-full outline-none text-gray-900 placeholder-gray-500" 
      placeholder="entry@sharematch.me"
    />
  </div>
</div>
```

### Cards
*   **Light**: White background, card shadow.
*   **Dark**: Glassmorphism.
```tsx
// Light Card
<div className="bg-white rounded-xl shadow-card p-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-2">Title</h3>
  <p className="text-gray-600">Content...</p>
</div>

// Dark / Glass Card
<div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
  <h3 className="text-lg font-semibold text-white mb-2">Title</h3>
  <p className="text-gray-400">Content...</p>
</div>
```

### Tables
*   **Style**: Clean, `divide-y`, no vertical borders.
*   **Header**: `text-sm font-medium text-gray-500`.
```tsx
<div className="overflow-hidden rounded-xl border border-gray-200">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Item 1</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">£500</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Badges
*   **Shape**: `rounded-full`
*   **Size**: `px-3 py-1 text-xs`
```tsx
<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-emerald500/10 text-brand-emerald500">
  Active
</span>
```

### Modals
*   **Backdrop**: Blur `backdrop-blur-sm`.
*   **Container**: `rounded-modal` (40px).
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
  <div className="bg-brand-cream rounded-modal shadow-heavy max-w-lg w-full p-8 relative">
    {/* Content */}
  </div>
</div>
```

---

## 4. Brand Identity Assets

*   **Logos**: [Drive Link Folder](https://drive.google.com/drive/folders/primary-logos)
*   **Fonts**: Inter (Google Fonts)
