# Dokumentasi Komprehensif Test Cases & Bug Report - Unibiz HRIS System

Dokumen ini ditujukan untuk tim Quality Assurance (QA) sebagai panduan pengujian manual maupun dasar otomasi (*automation testing script*) pada **Unibiz HRIS System**. Dokumen mencakup pengujian fungsional untuk **Role Employee** (Pengguna Biasa) dan **Role Administrator** (Super User), lengkap dengan temuan *critical bug* untuk diserahterimakan kepada QA lain.

---

## 1. Standar Penulisan & Klasifikasi Tipe Pengujian
Seluruh skenario dalam dokumen ini ditulis menggunakan pendekatan **BDD (Behavior-Driven Development)** dengan klausa *Given-When-Then* dan menggunakan aktor universal **"As User"** demi menjaga konsistensi standar industri.

### Klasifikasi Tipe Pengujian (Type):
1. **Smoke Testing**: Pengujian fungsi inti/paling krusial untuk memastikan aplikasi tidak *crash* saat pertama kali dirilis.
2. **Happy Flow**: Skenario ideal di mana pengguna mengisi seluruh data dengan benar dan sistem berjalan mulus tanpa hambatan.
3. **Positive**: Skenario sukses lainnya, termasuk variasi input valid, penggunaan fitur opsional, atau UI/UX interaktif.
4. **Negative**: Skenario gagal akibat input salah, field wajib dikosongkan, atau pelanggaran terhadap *business rules*.
5. **Regressions**: Pengujian ulang fitur lama untuk memastikan tidak ada efek samping/eror baru setelah ada pembaruan sistem.
6. **Edge Case**: Skenario ekstrem, tidak biasa, atau tak terduga yang berpotensi merusak logika sistem jika tidak diantisipasi.

---

## 2. Master Test Cases (Consolidated List 1-40)

Berikut adalah daftar 40 skenario utama hasil konsolidasi alur autentikasi, manajemen kehadiran personal, manajemen karyawan, dokumen digital, hingga pengajuan lembur/cuti:

| No | Test Suite/Group | Test Name | Scenario | Type | Result | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Login | As User, I am able to login with correct username and password | **Given** the login page is open<br>**When** I input valid username and password<br>**And** I click login<br>**Then** I should be redirected to the dashboard | Smoke Testing | | |
| **2** | Login | As User, I am not able to login with incorrect username or password | **Given** the login page is open<br>**When** I input invalid credentials<br>**Then** system should display an error message | Negative | | |
| **3** | Login | As User, I am able to click the Forgot Password link | **Given** the login page is open<br>**When** I click the "Forgot Password" link<br>**Then** I should be redirected to the password recovery page | Positive | | |
| **4** | Reset Password | As User, I am able to reset my password with existing user | **Given** the reset password page is open<br>**When** I input my registered email/username<br>**And** I follow the reset link<br>**Then** my password should be successfully updated | Happy Flow | | |
| **5** | Attendance (Clock In/Out) | As User, I am able to Clock In successfully | **Given** the clock in page is open with location obtained successfully<br>**When** I capture selfie and click "Clock In"<br>**Then** my attendance is recorded with "On-time" status | Happy Flow | | |
| **6** | Attendance (Clock In/Out) | As User, I cannot Clock In if location is missing/disabled | **Given** the clock in page is open without GPS permission enabled<br>**When** I click "Clock In"<br>**Then** system shows a location error message "Location required" | Negative | | |
| **7** | Attendance (Clock In/Out) | **[Edge Case]** Clock In from outside the company's allowed GPS radius | **Given** I am outside the permitted office GPS zone<br>**When** I attempt to Clock In<br>**Then** system rejects the submission with an out-of-bounds error | Edge Case | | |
| **8** | Attendance (Request) | As User, I can submit an attendance request | **Given** the attendance request page is open<br>**When** I fill all valid data (Date, Time, Reason)<br>**And** I click "Submit Request"<br>**Then** the request is successfully sent to the approval workflow | Happy Flow | | |
| **9** | Attendance (Request) | As User, I cannot send attendance request when mandatory columns are empty | **Given** the attendance request page is open<br>**When** I leave mandatory fields blank and click submit<br>**Then** system shows validation errors on empty fields | Negative | | |
| **10** | Attendance (My Request) | As User, I can see the request status whether it has been approved or pending | **Given** the My Request page is open<br>**When** the table loads<br>**Then** the status column displays accurate real-time status (Approved/Pending/Rejected) | Positive | | |
| **11** | Attendance (My Request) | As User, I can see the details of the request data and can delete it | **Given** the My Request page is open<br>**When** I click details or delete on a pending request<br>**Then** the system shows details or removes the data successfully | Positive | | |
| **12** | Attendance (My History) | As User, I can see my history of being late or on time | **Given** the My Attendance History page is open<br>**When** the table loads<br>**Then** I can view past records with their respective timestamps and statuses | Positive | | |
| **13** | Attendance (Approval) | As User, I can approve and reject attendance requests | **Given** the Approval Attendance page is open as an approver<br>**When** I review a request and click approve/reject<br>**Then** the request status is updated instantly | Happy Flow | | |
| **14** | Attendance (Management) | As User, I can filter data, search, view details, and export to Excel | **Given** the Attendance Management page is open<br>**When** I use filters, search, and click "Export to Excel"<br>**Then** the table updates and downloads an `.xlsx` file | Positive | | |
| **15** | Attendance (Statistics) | As User, I can see attendance data statistics for each user | **Given** the attendance statistics page is open<br>**When** the charts and analytics fully load<br>**Then** it displays accurate attendance trends | Positive | | |
| **16** | Employee (Management) | As User, I can search, edit, and filter users via Advanced Filters | **Given** the Employee Management page is open<br>**When** I apply advanced filters and click search<br>**Then** the employee master list updates accordingly | Positive | | |
| **17** | Employee (Add New) | As User, I can create and submit new employee data | **Given** the Add Employee page is open<br>**When** I fill all valid fields (Account, Personal, Employment) and submit<br>**Then** the new employee is saved with default password "password" | Happy Flow | | |
| **18** | Employee (Add New) | As User, I cannot submit employee data if mandatory columns are blank | **Given** the Add Employee page is open<br>**When** I submit with blank mandatory fields<br>**Then** the system blocks it with a validation tooltip | Negative | | |
| **19** | Employee (Resignation) | As User, I can search resignations and check their status | **Given** the Resignation Management page is open<br>**When** I search for a user or filter by status<br>**Then** I can view their resignation request status | Positive | | |
| **20** | Employee (Resignation) | As User, I can see user data details and delete the data | **Given** the Resignation Management page is open<br>**When** I click delete on a specific pending request<br>**Then** the resignation data is removed successfully | Positive | | |
| **21** | Employee (Transfer) | As User, I can submit transfer data, check status, and search employees | **Given** the Transfer Management page is open<br>**When** I submit a new transfer request<br>**Then** the request is logged and visible in the list | Happy Flow | | |
| **22** | Employee (Transfer) | As User, I can view transfer details and delete transfer data | **Given** the Transfer Management page is open<br>**When** I click details or delete on a pending item<br>**Then** the system executes the action successfully | Positive | | |
| **23** | Document (Management) | As User, I can filter documents and track signatory status | **Given** the Document Management page is open<br>**When** I apply status filters<br>**Then** I can see which users have or haven't signed the files | Positive | | |
| **24** | Document (Create) | As User, I can create and send documents | **Given** the Document Create page is open<br>**When** I fill document title, workflow type, and proceed<br>**Then** the document draft is initiated successfully | Happy Flow | | |
| **25** | Document (Create) | As User, I can upload document data | **Given** the Document Upload step is open<br>**When** I upload a valid PDF file under 10MB<br>**Then** the file is successfully attached | Positive | | |
| **26** | Document (Upload) | As User, I can use sequential workflow, insert files, and delete files | **Given** the upload page is open<br>**When** I set sequence and manage files<br>**Then** the workflow is saved correctly | Positive | | |
| **27** | Document (Details) | As User, I can successfully request a signature from one user | **Given** the Document Details page is open with a single signer<br>**When** the assigned user signs the document<br>**Then** the document status updates to Completed | Happy Flow | | |
| **28** | Document (Details) | As User, I can use parallel workflow with 2 signatories and download PDF | **Given** a parallel document is signed by 2 users<br>**When** I click download or download merged PDF<br>**Then** the signed PDF is successfully downloaded | Happy Flow | | |
| **29** | Overtime (Create) | As User, I can successfully enter and submit overtime data | **Given** the Create Overtime page is open<br>**When** I input valid date, times, and description<br>**Then** the overtime request is recorded into the workflow | Happy Flow | | |
| **30** | Overtime (Create) | As User, I cannot submit data with wrong time and empty mandatory columns | **Given** the Create Overtime page is open<br>**When** I input invalid time logic or leave fields empty<br>**Then** the system blocks the submission | Negative | | |
| **31** | Overtime (Requests) | As User, I can view details, delete, approve, and reject overtime | **Given** the Overtime Requests page is open<br>**When** I click an action button (approve/reject/delete)<br>**Then** the status updates accordingly | Happy Flow | | |
| **32** | Overtime (Approval) | As User, I can approve and reject overtime for users | **Given** the Overtime Approval page is open as an admin<br>**When** I make an approval decision on employee requests<br>**Then** the workflow proceeds | Happy Flow | | |
| **33** | Time Off (Submit) | As User, I can send time off data | **Given** the Submit New Leave page is open<br>**When** I fill the Leave Type, Dates, Reason, and submit<br>**Then** the leave request is successfully recorded | Happy Flow | | |
| **34** | Time Off (My Leave) | As User, I can view my time off request history | **Given** the My Leave page is open<br>**When** the page loads<br>**Then** I can see all my previous leave requests and their current statuses | Positive | | |
| **35** | Time Off (Submit) | As User, I cannot submit time off if mandatory fields are empty | **Given** the Submit New Leave page is open<br>**When** I leave the Date or Reason fields blank and click submit<br>**Then** the system blocks the submission with validation errors | Negative | | |
| **36** | Time Off (Submit) | **[Edge Case]** As User, leave duration should automatically exclude weekends | **Given** the Submit New Leave page is open<br>**When** I select a date range that includes Saturday and Sunday<br>**Then** the total days calculation should only count the business days | Edge Case | | |
| **37** | Time Off (Statistics)| As User, I can view my leave statistics and trends | **Given** the Leave Statistics page is open<br>**When** I select a specific year<br>**Then** the charts and summary statistics display accurate historical data | Positive | | |
| **38** | Profile (Password) | As User, I can change my account password | **Given** the Change Password page is open<br>**When** I input my current password and a valid new password (min. 8 chars)<br>**And** I click Update Password<br>**Then** my password is changed successfully | Happy Flow | | |
| **39** | Profile (UI/UX) | As User, I can toggle password visibility on change password fields | **Given** the Change Password page is open<br>**When** I check the "Show passwords" checkbox<br>**Then** all password fields should switch from masked to plain text | Positive | | |
| **40** | Authentication | As User, I can log out from the system securely | **Given** I am logged into the system<br>**When** I click the profile dropdown and select Logout<br>**Then** my active session is terminated and I am returned to the login page | Smoke Testing | | |

---

## 3. Administrator Exclusive & Configuration Test Cases

Skenario di bawah ini mencakup modul pengaturan tingkat tinggi perusahaan (*System Configuration, E-Materai, Office Location Coordinates, Shift Management, Role Matrix, & Leave Type Management*):

| No | Test Suite/Group | Test Name | Scenario | Type | Result | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **41** | Settings (Offices) | As User, I can create a new office location with GPS radius | **Given** the Add Office page (`/offices/create`) is open<br>**When** I fill Office Name, Code, and valid GPS Coordinates (Latitude/Longitude)<br>**And** I set a "Detection Radius" (e.g., 100m)<br>**And** I click "Save Office"<br>**Then** the new office is added to the system for attendance tracking | Happy Flow | | |
| **42** | Settings (Offices) | **[Edge Case]** Validation for Head Office toggle auto-shift | **Given** there is already an existing "Head Office" in the system<br>**When** I create or edit another office and turn ON the "Set as Head Office" toggle<br>**Then** the system should automatically remove the Head Office flag from the previous office and assign it to the new one | Edge Case | | |
| **43** | Settings (E-Materai) | As User, I can configure E-Materai API credentials | **Given** the System Configuration > E-Materai tab is open<br>**When** I input the Client ID, Client Secret, and API Key<br>**And** I click "Save E-Materai Settings"<br>**Then** the system securely encrypts and stores the credentials | Positive | | |
| **44** | Settings (Approval Lines) | As User, I can set global approval lines for workflows | **Given** the System Configuration > Approval Lines tab is open<br>**When** I add approvers sequentially for Time Off, Overtime, or Attendance requests<br>**And** I click "Save Approval Lines"<br>**Then** future requests should strictly follow this new approval sequence | Positive | | |
| **45** | Settings (Departments) | As User, I can create a new department with sequential flow | **Given** the Create New Department page (`/departments/create`) is open<br>**When** I input a unique "Department Name"<br>**And** I add approvers to the "Approval Flow (Sequential)" list<br>**And** I click "Create Department"<br>**Then** the department is created and active | Happy Flow | | |
| **46** | Settings (Shifts) | As User, I can view existing work shifts management | **Given** the Shift Management page (`/shifts`) is open<br>**When** the page loads<br>**Then** I should see a list of configured shifts (e.g., "Pagi") along with Start/End times, Grace Period, and employee count | Positive | | |
| **47** | Settings (Shifts) | As User, I can create a new work shift schedule | **Given** the Create New Shift page (`/shifts/create`) is open<br>**When** I fill valid "Shift Name", "Grace Period", "Start Time", and "End Time"<br>**And** I click "Create Shift"<br>**Then** the new shift is successfully created and appears in the Shift Management list | Happy Flow | | |
| **48** | Settings (Shifts) | As User, I cannot create a shift with invalid times | **Given** the Create New Shift page is open<br>**When** I leave mandatory fields blank OR set an illogical time range<br>**And** I click "Create Shift"<br>**Then** the system should block the submission and display validation errors | Negative | | |
| **49** | Settings (Roles) | As User, I can view system roles and custom roles matrix | **Given** the Role Management page (`/roles`) is open<br>**When** the data table loads<br>**Then** I should see a list of roles along with user count and permission count<br>**And** standard roles like "Admin" and "Employee" should be labeled as "System Role" | Positive | | |
| **50** | Settings (Roles) | **[Edge Case]** Core System Roles protection against deletion | **Given** the Role Management page is open<br>**When** I attempt to click the "Delete" icon on a System Role (e.g., Admin or Employee)<br>**Then** the system should disable the action or show an error "System Roles cannot be deleted" | Edge Case | | |
| **51** | Settings (Roles) | As User, I can quickly select or deselect all role permissions matrix | **Given** the Create New Role page (`/roles/create`) is open<br>**When** I click the "Select All" checkbox under Permissions<br>**Then** all individual permission checkboxes across all modules (Attendance, Documents, etc.) should be checked simultaneously | Positive | | |
| **52** | Settings (Roles) | As User, I can create a custom role with specific permissions | **Given** the Create New Role page is open<br>**When** I input "Role Name" and "Description"<br>**And** I manually tick specific permissions (e.g., "View Attendance", "Create Documents")<br>**And** I click "Create Role"<br>**Then** the custom role is successfully created with the exact designated permissions | Happy Flow | | |
| **53** | Settings (Leave Types) | As User, I can configure a new leave type configuration | **Given** the Create New Leave Type page (`/leave-types/create`) is open<br>**When** I input "Leave Type Name", "Maximum Days Per Year"<br>**And** I check the "Requires Supporting Document" checkbox<br>**And** I click "Create Leave Type"<br>**Then** the leave type is added to the system and forces users to upload a document when applying | Happy Flow | | |
| **54** | Settings (Leave Types) | **[Edge Case]** Used leave types data integrity protection | **Given** the Leave Type Management page (`/leave-types`) is open<br>**When** I attempt to delete a Leave Type that is already linked to past employee requests<br>**Then** the system should prevent hard-deletion to maintain data integrity and suggest to "Deactivate" instead | Edge Case | | |

---

## 4. Temuan Bug Penting (Critical Cross-Day Session Bug)

Selama proses eksplorasi QA, ditemukan sebuah *critical edge-case bug* pada modul kehadiran yang membekukan status pengguna jika lupa melakukan *Clock Out* melewati tengah malam.

### Bug Report: Pembekuan Sesi Absensi Lintas Hari
* **Test Case ID**: BUG-ATTENDANCE-001
* **Severity**: Major / Critical
* **Component**: Attendance Frontend State & Backend Validation
* **Status**: Open / FAIL

### Skenario Reproduksi (Steps to Reproduce):
1. **Given** Pengguna melakukan *Clock In* kemarin (misal: 17 Mei) dan sempat mengaktifkan status "Start Break" (Istrahat), namun lupa melakukan *Clock Out* hingga hari berganti (18 Mei).
2. **When** Pengguna membuka kembali halaman absen (`/attendance/clock`) pada keesokan harinya.
3. **Then** Tampilan *Frontend* membeku (*freeze*) pada kondisi hari kemarin—menampilkan jam masuk hari kemarin dan status *"You are currently on break"*.
4. **And** Ketika pengguna mencoba menekan tombol "Clock Out", *Backend* menolak aksi tersebut dan melemparkan pesan eror merah kontradiktif: **"You must clock in first"** (karena backend mendeteksi pengguna belum absen masuk *di tanggal hari ini*).

### Bukti Visual (Screenshot Context):
Eror ini memicu ketidaksesuaian status (*State Mismatch*) di mana tombol *Clock Out* terkunci oleh validasi tanggal server, sedangkan tombol *Clock In* hilang karena *state frontend* mendeteksi status masih dalam sesi aktif istirahat.

### Kriteria Perbaikan untuk Developer (Acceptance Criteria):
* **Backend Auto-Resolve**: Menyediakan *cron job scheduler* yang berjalan otomatis setiap pukul 23:59 server untuk secara otomatis menutup (*auto-force clock out*) semua sesi menggantung yang belum selesai hari itu dan memberi tanda khusus (*Missed Clock Out*).
* **Frontend State Clean-up**: Menambahkan pengecekan tanggal saat halaman absensi dimuat (`onMount` / `page load`). Jika tanggal sesi yang tersimpan di lokal/state berbeda dengan tanggal hari ini (*server date*), bersihkan tampilan (*auto-reset state*) sehingga pengguna dapat melakukan *Clock In* baru untuk hari ini dengan normal.

---
*Dokumentasi ini dibuat untuk memfasilitasi serah terima antar tim QA Unibiz HRIS System.*
