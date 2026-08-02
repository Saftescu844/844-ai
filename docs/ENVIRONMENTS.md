# Mediile proiectului 844-ai.ro

Acest document descrie separarea dintre producție și staging și fluxul sigur de lucru.

Nu se introduc în acest document parole, chei API, connection string-uri sau alte secrete.

---

## 1. Producție

### GitHub

- Branch: `main`
- Rol: codul public al site-ului
- Modificările ajung în producție numai după validarea în staging

### Railway

- Project: `believable-intuition`
- Service: `844-ai`
- Public URL: `https://844-ai.ro`
- Connected branch: `main`
- Auto Deploy: activ

### Supabase

- Project: `844-ai-prod`
- Project reference: `hyapqvnubhwkwmwudeit`
- Database: PostgreSQL producție
- Storage bucket: `media`
- Bucket access: public

---

## 2. Staging

### GitHub

- Branch permanent: `staging`
- Rol: testarea schimbărilor înainte de promovarea în producție
- Branch-urile temporare se creează din `staging`
- Pull Request-urile de test se fac către `staging`

### Railway

- Project: `resilient-harmony`
- Service: `844-ai`
- Public URL: `https://844-ai-production.up.railway.app`
- Connected branch: `staging`
- Auto Deploy: dezactivat
- Deploymenturile se pornesc manual după verificarea codului și a variabilelor
- Healthcheck Path: `/ro`
- Pre-deploy Command: neconfigurată
- Migrațiile Payload sunt incluse în build prin `prodMigrations`

### Supabase

- Project: `844-ai-dev`
- Project reference: `tvtnpcqawaekhmhyfrnc`
- Database: PostgreSQL staging
- Storage bucket: `media`
- Bucket access: public

---

## 3. Separarea mediilor

Staging și producția folosesc resurse diferite pentru:

- baza de date PostgreSQL;
- acreditările S3;
- endpointul S3;
- URL-ul public al fișierelor media;
- `PAYLOAD_SECRET`;
- utilizatorii și sesiunile Payload.

URL-ul public media pentru staging este:

```text
https://tvtnpcqawaekhmhyfrnc.supabase.co/storage/v1/object/public/media
```

URL-ul public media pentru producție este:

```text
https://hyapqvnubhwkwmwudeit.supabase.co/storage/v1/object/public/media
```

---

## 4. Variabile importante

Variabilele sunt configurate separat în Railway pentru fiecare mediu:

```text
DATABASE_URL
PAYLOAD_SECRET
SITE_URL
MEDIA_PUBLIC_BASE_URL
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
S3_ENDPOINT
S3_REGION
S3_BUCKET
```

Valorile sensibile nu se salvează în GitHub, în documentație sau în capturi de ecran.

---

## 5. Fluxul recomandat de dezvoltare

1. Se creează un branch temporar din `staging`.
2. Se face o modificare mică și verificabilă.
3. Se creează un Pull Request către `staging`.
4. Se verifică fișierele modificate și rezultatul buildului.
5. Se face merge în `staging`.
6. Se pornește manual deploymentul Railway staging.
7. Se testează aplicația, Payload, baza de date și storage-ul.
8. După validare, modificările pot fi promovate separat către `main`.
9. Producția este verificată după deployment.
10. Branch-ul temporar se șterge numai după confirmarea integrării.

---

## 6. Reguli de siguranță

- Nu se conectează stagingul la `844-ai-prod`.
- Nu se folosesc în staging cheile S3 de producție.
- Nu se copiază `PAYLOAD_SECRET` între medii.
- Nu se schimbă branch-ul Railway de producție de la `main`.
- Nu se activează Auto Deploy în staging fără o decizie explicită.
- Nu se fac modificări directe în producție pentru teste.
- Nu se șterg proiecte Railway, baze de date, bucketuri sau branch-uri fără verificare.
- Nu se modifică schema PostgreSQL fără un flux de migrații controlat.

---

## 7. Starea verificată

Au fost confirmate:

- conectarea stagingului la `844-ai-dev`;
- conectarea storage-ului staging la proiectul dev;
- existența unui `PAYLOAD_SECRET` separat;
- autentificarea în Payload staging;
- afișarea colecțiilor din baza dev;
- încărcarea unui fișier exclusiv în storage-ul dev;
- absența fișierului de test din producție;
- ștergerea corectă a fișierului de test din Payload și storage.

Producția `844-ai.ro` nu a fost afectată în timpul acestor verificări.

---

## 8. Migrațiile bazei de date

Modificările schemei PostgreSQL se fac exclusiv prin fluxul controlat documentat în:

[`docs/DATABASE_MIGRATIONS.md`](./DATABASE_MIGRATIONS.md)

Înainte de orice migrare se verifică mediul conectat, starea migrărilor și faptul că `PAYLOAD_DB_PUSH` este dezactivat.
