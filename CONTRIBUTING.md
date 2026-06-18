# 🤝 Contributing to ClinicFlow AI

Thanks for your interest in improving ClinicFlow AI! 🎉

## 🧭 Getting started

1. 🍴 **Fork** the repository and clone your fork.
2. 📦 Install dependencies: `npm install`
3. 🔧 Copy `.env.example` to `.env.local` and fill in your keys.
4. 🌱 (Optional) seed demo data: `npm run seed`
5. 🚀 Start the dev server: `npm run dev`

## 🌿 Branching

- Create a descriptive branch: `git checkout -b feat/<feature>` or `fix/<bug>`.
- Keep pull requests focused — one logical change per PR.

## ✅ Before you open a PR

Run the checks locally:

```bash
npm run lint
npm run typecheck
npm run build
```

## 📝 Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add appointment reminders`
- `fix: prevent double-booking on reschedule`
- `docs: clarify Vapi setup`
- `chore: bump dependencies`

## 🐛 Reporting bugs

Open an issue with clear steps to reproduce, expected vs. actual behavior, and your environment details.

## 💡 Proposing features

Open an issue describing the problem and your proposed solution before starting large changes — it helps avoid duplicate work.

---

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE). 💛
