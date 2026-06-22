# Verita — Routes

## Router Config — `frontend/src/App.tsx`

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Landing />} />           {/* No AppShell */}
    <Route element={<AppShell />}>                      {/* Sidebar + header layout */}
      <Route path="/studio"   element={<Studio />} />
      <Route path="/overview" element={<Overview />} />
      <Route path="/risk"     element={<Risk />} />
      <Route path="/nlp"      element={<NLP />} />
      <Route path="/settings" element={<Settings />} />
    </Route>
  </Routes>
</BrowserRouter>
```

## Route Map

| Path        | Component                              | Layout   |
|-------------|----------------------------------------|----------|
| `/`         | `pages/Landing.tsx` → `ImmersiveLanding` | None (fullscreen 3D) |
| `/overview` | `pages/Overview.tsx`                   | AppShell |
| `/studio`   | `pages/Studio.tsx`                     | AppShell |
| `/risk`     | `pages/Risk.tsx`                       | AppShell |
| `/nlp`      | `pages/NLP.tsx`                        | AppShell |
| `/settings` | `pages/Settings.tsx`                   | AppShell |

## Notes
- `/` has no AppShell — it's a fullscreen immersive 3D experience (React Three Fiber)
- CustomCursor is rendered on all routes EXCEPT `/`
- All inner routes are wrapped in `<ErrorBoundary>`
- AppShell sidebar nav items: Overview, Studio, Risk Engine, NLP Insight, Settings
