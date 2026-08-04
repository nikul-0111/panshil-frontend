import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import DashboardCards from "../components/DashboardCards";
import { transliterateEnglishToGujarati } from "../utils/translator";
import { generateReceiptPDF } from "../utils/generateReceiptPDF";
import { matchesSearch } from "../utils/transliterate";
import api from "../services/api";
import "../styles/Dashboard.css";

function DashboardPage({ onNavigate }) {
  const [tab, setTab] = useState("community");
  const [profile, setProfile] = useState({});
  const [summary, setSummary] = useState({});
  const [members, setMembers] = useState([]);
  const [villages, setVillages] = useState([]);
  const [payment, setPayment] = useState({});
  const [pendingUsers, setPendingUsers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [reportFilter, setReportFilter] = useState("paid");

  const [language, setLanguage] = useState(() => localStorage.getItem("app_language") || "gu");
  const [theme, setTheme] = useState(() => localStorage.getItem("app_theme") || "light");

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    localStorage.setItem("app_language", newLang);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("app_theme", newTheme);
  };

  // Admin Add Death Event States
  const [showAddDeathModal, setShowAddDeathModal] = useState(false);
  const [deathForm, setDeathForm] = useState({ name: "", village: "", deathDate: "", dueDate: "", amount: 50 });
  const [deathLoading, setDeathLoading] = useState(false);

  // Date Formatter Helper (Converts YYYY-MM-DD HTML5 calendar picker value to DD/MM/YYYY display)
  const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split("-");
      return `${d}/${m}/${y}`;
    }
    return dateStr;
  };

  const handleAddDeathSubmit = async (e) => {
    e.preventDefault();
    if (!deathForm.name || !deathForm.village || !deathForm.deathDate || !deathForm.dueDate) {
      alert("કૃપા કરીને બધી જ જરૂરી વિગતો ભરો.");
      return;
    }
    try {
      setDeathLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        ...deathForm,
        deathDate: formatDateToDDMMYYYY(deathForm.deathDate),
        dueDate: formatDateToDDMMYYYY(deathForm.dueDate)
      };

      const res = await api.post("/api/admin/death-event", payload, { headers });
      if (res.data.success) {
        alert("સદગત મરણ નોંધ સફળતાપૂર્વક ઉમેરાઈ ગઈ છે.");
        setDeathForm({ name: "", village: "", deathDate: "", dueDate: "", amount: 50 });
        setShowAddDeathModal(false);
        setRefreshTrigger((prev) => prev + 1);
      } else {
        alert(res.data.message || "મરણ નોંધ સાચવવામાં સમસ્યા આવી.");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "સર્વર ભૂલ. કૃપા કરીને ફરી પ્રયાસ કરો.");
    } finally {
      setDeathLoading(false);
    }
  };

  // Family Sub-Members States
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyForm, setFamilyForm] = useState({ name: "", relation: "Father", gender: "Male", age: "", mobile: "", occupation: "" });
  const [familyLoading, setFamilyLoading] = useState(false);
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);

  // Family Directory & Pagination States
  const [familyDirectory, setFamilyDirectory] = useState([]);
  const [selectedDirectoryHeadId, setSelectedDirectoryHeadId] = useState(null);
  const [memberCurrentPage, setMemberCurrentPage] = useState(1);
  const [directoryCurrentPage, setDirectoryCurrentPage] = useState(1);
  const [deathCurrentPage, setDeathCurrentPage] = useState(1);

  // Admin Family Approvals States
  const [familyRequests, setFamilyRequests] = useState([]);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedSubMember, setSelectedSubMember] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Admin History States (approved/rejected logs)
  const [memberHistory, setMemberHistory] = useState([]);
  const [familyHistory, setFamilyHistory] = useState([]);
  const [memberHistoryPage, setMemberHistoryPage] = useState(1);
  const [familyHistoryPage, setFamilyHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 5;

  // Admin Member Verification Inspector States
  const [inspectItem, setInspectItem] = useState(null);

  // Registered Community Villages List
  const availableVillages = Array.from(new Set([
    ...(summary.villages || []),
    ...(villages.map(v => v.name) || []),
    "પાલનપુર", "છાપી", "ડીસા", "મહેસાણા", "સિદ્ધપુર", "પાટણ", "થરાદ", "ધાનેરા", "રાધનપુર", "દાંતા", "દિયોદર", "ભાભર", "વડનગર", "ઊંઝા", "વિસનગર", "ખેરાલુ"
  ])).filter(Boolean).sort();

  // Duplicate Detector Helper (Checks if mobile or name+village already exists in active members)
  const checkIsDuplicate = (targetItem) => {
    if (!targetItem) return false;
    const targetMobile = (targetItem.mobile || "").trim();
    const targetName = (targetItem.name || "").trim().toLowerCase();
    const targetVillage = (targetItem.village || targetItem.familyHead?.village || "").trim().toLowerCase();

    return members.some((m) => {
      if (m._id === targetItem._id) return false;
      const mMobile = (m.mobile || "").trim();
      const mName = (m.name || "").trim().toLowerCase();
      const mVillage = (m.village || "").trim().toLowerCase();

      if (targetMobile && mMobile && targetMobile === mMobile) return true;
      if (targetName && mName && targetName === mName && mVillage && targetVillage && mVillage === targetVillage) return true;
      return false;
    });
  };

  const handleFamilyFormSubmit = async (e) => {
    e.preventDefault();
    if (!familyForm.name || !familyForm.relation) {
      alert("કૃપા કરીને નામ અને સંબંધ ની પસંદગી કરો.");
      return;
    }
    try {
      setFamilyLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.post("/api/family/members", familyForm, { headers });
      if (res.data.success) {
        alert("પરિવાર સભ્ય ઉમેરવાની વિનંતી સફળતાપૂર્વક મોકલવામાં આવી છે. એડમિન મંજૂરી બાદ ખાતામાં ઉમેરાશે.");
        setFamilyForm({ name: "", relation: "Father", gender: "Male", age: "", mobile: "", occupation: "" });
        setShowAddFamilyModal(false);
        setRefreshTrigger((prev) => prev + 1);
      } else {
        alert(res.data.message || "પરિવાર સભ્ય સાચવવામાં સમસ્યા આવી.");
      }
    } catch (err) {
      console.error(err);
      alert("સર્વર ભૂલ. કૃપા કરીને થોડી વાર પછી પ્રયાસ કરો.");
    } finally {
      setFamilyLoading(false);
    }
  };

  const handleDeleteFamilyMember = async (id) => {
    if (!window.confirm("શું તમે ખરેખર આ પરિવાર સભ્યની વિનંતી રદ/દૂર કરવા માંગો છો?")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.delete(`/api/family/members/${id}`, { headers });
      if (res.data.success) {
        alert("સભ્ય સફળતાપૂર્વક દૂર કરવામાં આવ્યો છે.");
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (err) {
      console.error(err);
      alert("દૂર કરવામાં નિષ્ફળ.");
    }
  };

  const handleFamilyApproval = async (id, status, reason = "") => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.put(`/api/family/admin/requests/${id}`, { status, rejectionReason: reason }, { headers });
      if (res.data.success) {
        alert(status === 'approved' ? "પરિવાર સભ્ય સફળતાપૂર્વક મંજૂર થયો." : "પરિવાર સભ્ય નામંજૂર થયો.");
        setRejectModalOpen(false);
        setSelectedSubMember(null);
        setRejectionReasonInput("");
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (err) {
      console.error(err);
      alert("ક્રિયા પૂર્ણ કરવામાં નિષ્ફળ.");
    } finally {
      setActionLoading(false);
    }
  };

  // Profile Editor States
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", mobile: "", village: "", age: "", email: "" });
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Profile Avatar Modal States
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarActiveTab, setAvatarActiveTab] = useState("gallery"); // 'gallery' | 'upload'
  const [selectedAvatarChoice, setSelectedAvatarChoice] = useState("");
  const [customAvatarPreview, setCustomAvatarPreview] = useState("");
  const [avatarSaveLoading, setAvatarSaveLoading] = useState(false);
  const [avatarModalError, setAvatarModalError] = useState("");

  const presetAvatars = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aria",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Maya",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Noah",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Panchshil",
    "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Happy",
    "https://api.dicebear.com/7.x/initials/svg?seed=" + encodeURIComponent(profile?.name || "PS")
  ];

  const compressAndResizeImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 350;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleCustomPhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarModalError("કૃપા કરીને માત્ર ફોટો ફાઈલ (JPG, PNG, WebP) પસંદ કરો.");
      return;
    }

    setAvatarModalError("");
    try {
      const compressedDataUrl = await compressAndResizeImage(file);
      setCustomAvatarPreview(compressedDataUrl);
      setSelectedAvatarChoice(compressedDataUrl);
    } catch (err) {
      console.error(err);
      setAvatarModalError("ફોટો પ્રક્રિયા કરવામાં ભૂલ આવી.");
    }
  };

  const handleOpenAvatarModal = () => {
    const currentAvatar = profile?.avatar || "";
    setSelectedAvatarChoice(currentAvatar);
    if (currentAvatar.startsWith("data:")) {
      setCustomAvatarPreview(currentAvatar);
      setAvatarActiveTab("upload");
    } else {
      setCustomAvatarPreview("");
      setAvatarActiveTab("gallery");
    }
    setAvatarModalError("");
    setShowAvatarModal(true);
  };

  const handleSaveAvatar = async () => {
    setAvatarSaveLoading(true);
    setAvatarModalError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        onNavigate("/login");
        return;
      }

      const res = await api.put(
        "/api/auth/update-avatar",
        { avatar: selectedAvatarChoice },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        const updatedUser = res.data.data.user;
        setProfile(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setShowAvatarModal(false);
        setRefreshTrigger((prev) => prev + 1);
      } else {
        setAvatarModalError(res.data.message || "ફોટો અપડેટ કરવામાં ભૂલ આવી.");
      }
    } catch (err) {
      console.error(err);
      setAvatarModalError(err.response?.data?.message || "સર્વર ભૂલ. કૃપા કરીને ફરી પ્રયાસ કરો.");
    } finally {
      setAvatarSaveLoading(false);
    }
  };

  // Dynamic data arrays initialized as empty
  const [pendingDeaths, setPendingDeaths] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);

  // Dynamic Date Comparison Logic
  const isDueDatePassed = (dateStr) => {
    if (!dateStr) return false;
    const [day, month, year] = dateStr.split("/").map(Number);
    const dueDate = new Date(year, month - 1, day);
    const currentDate = new Date();

    dueDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);

    return currentDate > dueDate;
  };

  // Automated Family Payment Calculation (₹50 per approved family member + ₹50 penalty per member if past due date)
  const calculateTotalAmount = () => {
    const familyMultiplier = payment.familyCoveredMembers || (1 + familyMembers.filter(m => m.status === 'approved').length) || 1;
    return pendingDeaths.reduce((sum, item) => {
      let singleFee = Number(item.amount) > 0 ? Number(item.amount) : 50;
      let itemAmount = singleFee * familyMultiplier;
      if (isDueDatePassed(item.dueDate)) {
        itemAmount += (50 * familyMultiplier); // ₹50 Late Fee Penalty per approved family member
      }
      return sum + itemAmount;
    }, 0);
  };

  const totalAmount = calculateTotalAmount();

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("ચુકવણી કરવા માટે કૃપા કરીને લોગિન કરો.");
        onNavigate("/login");
        return;
      }

      if (totalAmount <= 0) {
        alert("ચુકવણી માટે કોઈ રકમ ઉપલબ્ધ નથી.");
        return;
      }

      console.log("Submitting payment for amount:", totalAmount);

      // 1. Create order on your backend
      const orderRes = await api.post("/api/community/payment/order",
        {
          amount: totalAmount,
          deceasedName: pendingDeaths.map((d) => d.name).join(", "),
          village: pendingDeaths.map((d) => d.village).join(", "),
          deathDate: pendingDeaths.map((d) => d.date || d.deathDate).join(", "),
          dueDate: pendingDeaths.map((d) => d.dueDate).join(", ")
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const orderData = orderRes.data;
      if (!orderData.success) {
        alert("ઓર્ડર બનાવવામાં નિષ્ફળતા: " + (orderData.message || "અજ્ઞાત ભૂલ"));
        return;
      }

      const { orderId, amount, currency, keyId } = orderData.data;

      // 2. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert("રેઝરપે SDK લોડ કરવામાં નિષ્ફળ. કૃપા કરીને ઇન્ટરનેટ કનેક્શન તપાસો.");
        return;
      }

      // 3. Configure Razorpay
      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: "Panchshil Community Fund",
        description: `સહાય ફંડ કુલ ચૂકવણી - ₹${totalAmount}`,
        order_id: orderId,
        handler: async function (response) {
          // Pre-open window BEFORE async API call so browser pop-up blocker DOES NOT block it!
          const receiptWin = window.open("", "_blank");
          if (receiptWin) {
            receiptWin.document.write(`
              <!DOCTYPE html>
              <html>
              <head><title>રસીદ જનરેટ થઈ રહી છે...</title></head>
              <body style="font-family: system-ui, sans-serif; text-align: center; padding: 60px 20px; background: #f8fafc; color: #1e293b;">
                <div style="max-width: 400px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                  <div style="font-size: 40px; margin-bottom: 10px;">⏳</div>
                  <h3 style="color: #2563eb; margin-bottom: 8px;">ચુકવણી ચકાસાઈ રહી છે...</h3>
                  <p style="color: #64748b; font-size: 14px;">તમારી અધિકૃત PDF રસીદ ક્ષણવારમાં ખુલી રહી છે...</p>
                </div>
              </body>
              </html>
            `);
          }

          try {
            // 4. Verify the payment
            const verifyRes = await api.post("/api/community/payment/verify", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            }, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (verifyRes.data.success) {
              const verifiedData = verifyRes.data.data || {};
              const receiptPayload = {
                ...verifiedData,
                name: pendingDeaths.map((d) => d.name).join(", "),
                amount: totalAmount,
                paymentId: response.razorpay_payment_id,
              };

              // Instantly clear pending deaths list from local state
              setPendingDeaths([]);
              generateReceiptPDF(receiptPayload, profile, receiptWin);
              setRefreshTrigger((prev) => prev + 1);
            } else {
              if (receiptWin && !receiptWin.closed) receiptWin.close();
              alert("ચુકવણી ચકાસણી નિષ્ફળ ગઈ.");
            }
          } catch (err) {
            if (receiptWin && !receiptWin.closed) receiptWin.close();
            console.error("Verification Error:", err);
            alert("ચુકવણી ચકાસણી દરમિયાન કોઈ ભૂલ આવી.");
          }
        },
        prefill: {
          name: profile.name || "",
          contact: profile.mobile || "",
          email: profile.email || "",
        },
        theme: { color: "#2563eb" },
      };

      const rzp = new window.Razorpay(options);

      // Handle Payment Failure
      rzp.on('payment.failed', function (response) {
        console.error("Payment Failed:", response.error);
        alert(`ચુકવણી નિષ્ફળ ગઈ! (Payment Failed)\nકારણ: ${response.error.description}`);
        // Optionally, you could make an API call here to your backend to log the failure
      });

      rzp.open();
    } catch (error) {
      console.error("Payment Error:", error);
      alert("ચુકવણી પ્રક્રિયા શરૂ કરવામાં ભૂલ આવી.");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      onNavigate("/login");
      return;
    }

    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setProfile(JSON.parse(storedUser));
      } catch (err) {
        console.error(err);
        setProfile({});
      }
    }

    const headers = { Authorization: `Bearer ${token}` };

    api.get("/api/auth/me", { headers })
      .then((res) => {
        if (res.data?.success && res.data?.data?.user) {
          const freshUser = res.data.data.user;
          setProfile(freshUser);
          localStorage.setItem("user", JSON.stringify(freshUser));
        }
      })
      .catch(console.error);

    api.get("/api/community/summary", { headers })
      .then((res) => setSummary(res.data.data || {}))
      .catch(console.error);

    api.get("/api/community/members?search=" + encodeURIComponent(search), { headers })
      .then((res) => setMembers(res.data.data || []))
      .catch(console.error);

    api.get("/api/community/villages?search=" + encodeURIComponent(search), { headers })
      .then((res) => setVillages(res.data.data || []))
      .catch(console.error);

    api.get("/api/community/payment", { headers })
      .then((res) => {
        const backendData = res.data.data || {};
        setPayment(backendData);
        if (Array.isArray(backendData.pendingDeaths)) {
          setPendingDeaths(backendData.pendingDeaths);
        }
        if (backendData.history) setPaymentHistory(backendData.history);
      })
      .catch(console.error);

    api.get("/api/family/members", { headers })
      .then((res) => setFamilyMembers(res.data.data || []))
      .catch(console.error);

    const parsedUser = storedUser ? JSON.parse(storedUser) : null;
    if (parsedUser && parsedUser.role === 'admin') {
      api.get("/api/admin/users/pending", { headers })
        .then((res) => setPendingUsers(res.data.data || []))
        .catch(console.error);

      api.get("/api/family/admin/requests", { headers })
        .then((res) => setFamilyRequests(res.data.data || []))
        .catch(console.error);

      api.get("/api/admin/users/history", { headers })
        .then((res) => setMemberHistory(res.data.data || []))
        .catch(console.error);

      api.get("/api/admin/family/history", { headers })
        .then((res) => setFamilyHistory(res.data.data || []))
        .catch(console.error);

      api.get("/api/admin/family-directory", { headers })
        .then((res) => {
          const list = res.data.data || [];
          setFamilyDirectory(list);
          if (list.length > 0 && !selectedDirectoryHeadId) {
            setSelectedDirectoryHeadId(list[0]._id);
          }
        })
        .catch(console.error);
    } else {
      setPendingUsers([]);
      setFamilyRequests([]);
      setFamilyDirectory([]);
    }
  }, [search, refreshTrigger]);

  const logout = () => {
    localStorage.clear();
    onNavigate("/login");
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setSearch("");
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setEditForm({
      name: profile.name || "",
      mobile: profile.mobile || "",
      village: profile.village || "",
      age: profile.age || "",
      email: profile.email || "",
    });
    setProfileError("");
    setProfileSuccess("");
    setIsEditing(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setProfileLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        onNavigate("/login");
        return;
      }

      const translatedName = transliterateEnglishToGujarati(editForm.name);
      const translatedVillage = transliterateEnglishToGujarati(editForm.village);

      const response = await api.put("/api/auth/update-profile", {
        name: translatedName,
        mobile: editForm.mobile,
        village: translatedVillage,
        age: editForm.age,
        email: editForm.email,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const resData = response.data;
      if (!resData.success) {
        throw new Error(resData.message || "પ્રોફાઇલ અપડેટ કરવામાં કોઈ ભૂલ આવી.");
      }

      setProfileSuccess("પ્રોફાઇલ સફળતાપૂર્વક અપડેટ કરવામાં આવી છે!");
      setProfile(resData.data.user);
      localStorage.setItem("user", JSON.stringify(resData.data.user));
      setRefreshTrigger((prev) => prev + 1);

      setTimeout(() => {
        setIsEditing(false);
        setProfileSuccess("");
      }, 1500);
    } catch (err) {
      setProfileError(err.message || "કંઈક ભૂલ આવી.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUserApproval = async (userId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await api.put(`/api/admin/users/${userId}/status`, {
        status: newStatus,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const resData = response.data;
      if (!resData.success) {
        throw new Error(resData.message || "અરજી પ્રોસેસ કરવામાં કોઈ ભૂલ આવી.");
      }

      alert(resData.message || "ક્રિયા સફળ રહી!");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      alert(err.message || "કંઈક ભૂલ આવી.");
    }
  };

  return (
    <div className={`dashboard ${theme === "dark" ? "dark-mode" : ""} ${theme === "compact" ? "compact-mode" : ""}`}>
      <Sidebar
        tab={tab}
        setTab={handleTabChange}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onLogout={logout}
        language={language}
      />

      <div className="dashboard-main">
        <Topbar
          profile={profile}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          onOpenAvatarModal={handleOpenAvatarModal}
          language={language}
        />

        <div className="dashboard-content">

          {/* Registration Approvals Tab */}
          {tab === "member_approvals" && (
            <div className="page-card pending-users-panel">
              <div className="panel-header-flex" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div className="panel-title-area">
                  <h2 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                    🔔 નવા રજીસ્ટ્રેશન વિનંતીઓ
                    {pendingUsers.length > 0 && <span className="pending-badge">{pendingUsers.length}</span>}
                  </h2>
                  <p className="panel-subtitle" style={{ margin: '5px 0 0 0' }}>કૃપા કરીને નીચેના સભ્યોની માહિતી ચકાસો અને મંજૂરી આપો.</p>
                </div>
                <div className="search-wrapper" style={{ position: 'relative', height: '44px', maxH: '44px', margin: 0, flex: '1 1 220px', width: '100%', boxSizing: 'border-box' }}>
                  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#94a3b8', pointerEvents: 'none', zIndex: 2 }}>
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input className="search-box-premium" placeholder="નામ કે ગામથી શોધો..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', height: '44px', padding: '10px 14px 10px 42px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              {pendingUsers.filter(u => matchesSearch(u, search)).length > 0 ? (
                <div className="pending-users-list">
                  {pendingUsers.filter(u => matchesSearch(u, search)).map((user) => {
                    const isDup = checkIsDuplicate(user);
                    return (
                      <div key={user._id} className="pending-user-card" style={{ border: isDup ? '1.5px solid #f59e0b' : '1px solid #e2e8f0', background: isDup ? '#fffbeb' : '#ffffff' }}>
                        {isDup && (
                          <div style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            ⚠️ સંભવિત ડુપ્લિકેટ (સમાન મોબાઇલ અથવા ગામમાં આ નામનો સભ્ય નોંધાયેલ છે)
                          </div>
                        )}
                        <div className="pending-user-info">
                          <div className="pending-user-avatar">
                            {user.name ? user.name.charAt(0) : "👤"}
                          </div>
                          <div className="pending-user-details">
                            <h4>{user.name}</h4>
                            <p>📞 <strong>મોબાઇલ:</strong> <a href={`tel:${user.mobile}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '700' }}>{user.mobile} 📲 (ચકાસણી માટે કોલ કરો)</a></p>
                            <p>🏘 <strong>ગામ:</strong> {user.village}</p>
                            <p>🎂 <strong>ઉંમર:</strong> {user.age} વર્ષ</p>
                            {user.email && <p>✉️ <strong>ઈમેઈલ:</strong> {user.email}</p>}
                          </div>
                        </div>
                        <div className="pending-user-actions" style={{ flexWrap: 'wrap', gap: '8px' }}>
                          <button onClick={() => setInspectItem({ ...user, type: 'registration' })} style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}>
                            🔍 વિગતો ચકાસો
                          </button>
                          <button className="approve-btn-premium" onClick={() => handleUserApproval(user._id, 'approved')}>✅ મંજૂર કરો</button>
                          <button className="reject-btn-premium" onClick={() => handleUserApproval(user._id, 'rejected')}>❌ નામંજૂર</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-search-state" style={{ padding: "40px 20px" }}>
                  <div className="empty-icon">🔔</div>
                  <p>હાલમાં કોઈ નવી રજીસ્ટ્રેશન વિનંતીઓ બાકી નથી.</p>
                </div>
              )}

              {/* ───── Member History Section ───── */}
              <div style={{ marginTop: '32px', borderTop: '2px dashed #e2e8f0', paddingTop: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📋 ઇતિહાસ — સ્વીકૃત / નામંજૂર સભ્ય-નોંધ
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.83rem', color: '#64748b' }}>અત્યાર સુધી મંજૂર અથવા નામંજૂર કરાયેલ સભ્ય-નોંધ</p>
                  </div>
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700', border: '1px solid #e2e8f0' }}>
                    કુલ: {memberHistory.length} નોંધ
                  </span>
                </div>

                {memberHistory.length > 0 ? (() => {
                  const mhTotal = Math.ceil(memberHistory.length / HISTORY_PAGE_SIZE);
                  const mhSlice = memberHistory.slice((memberHistoryPage - 1) * HISTORY_PAGE_SIZE, memberHistoryPage * HISTORY_PAGE_SIZE);
                  return (
                    <>
                      <div className="hist-table-wrap">
                        <table className="history-log-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>નામ</th>
                              <th>ગામ</th>
                              <th>ઉંમર</th>
                              <th>મોબાઇલ</th>
                              <th>નિર્ણય</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mhSlice.map((u, i) => (
                              <tr key={u._id}>
                                <td style={{ color: '#94a3b8', fontWeight: 600 }}>{(memberHistoryPage - 1) * HISTORY_PAGE_SIZE + i + 1}</td>
                                <td><strong>{u.name}</strong></td>
                                <td>{u.village || '—'}</td>
                                <td>{u.age ? `${u.age} વર્ષ` : '—'}</td>
                                <td>{u.mobile || '—'}</td>
                                <td>
                                  {u.status === 'approved'
                                    ? <span className="hist-badge-approved">✅ મંજૂર</span>
                                    : <span className="hist-badge-rejected">❌ નામંજૂર</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="hist-mobile-cards">
                        {mhSlice.map((u) => (
                          <div key={u._id} className={`hist-card ${u.status === 'approved' ? 'hist-card-approved' : 'hist-card-rejected'}`}>
                            <div className="hist-card-top">
                              <span className="hist-card-name">{u.name}</span>
                              {u.status === 'approved'
                                ? <span className="hist-badge-approved">✅ મંજૂર</span>
                                : <span className="hist-badge-rejected">❌ નામંજૂર</span>}
                            </div>
                            <div className="hist-card-row"><span>🏘 ગામ:</span><span>{u.village || '—'}</span></div>
                            <div className="hist-card-row"><span>📞 મોબાઇલ:</span><span>{u.mobile || '—'}</span></div>
                            <div className="hist-card-row"><span>🎂 ઉંમર:</span><span>{u.age ? `${u.age} વર્ષ` : '—'}</span></div>
                          </div>
                        ))}
                      </div>

                      {mhTotal > 1 && (
                        <div className="hist-pagination">
                          <button className="hist-pg-btn" disabled={memberHistoryPage <= 1} onClick={() => setMemberHistoryPage(p => p - 1)}>◄ પાછળ</button>
                          {Array.from({ length: mhTotal }, (_, idx) => (
                            <button key={idx} className={`hist-pg-num ${memberHistoryPage === idx + 1 ? 'active' : ''}`} onClick={() => setMemberHistoryPage(idx + 1)}>{idx + 1}</button>
                          ))}
                          <button className="hist-pg-btn" disabled={memberHistoryPage >= mhTotal} onClick={() => setMemberHistoryPage(p => p + 1)}>આગળ ►</button>
                        </div>
                      )}
                    </>
                  );
                })() : (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '0.9rem' }}>📭 હજી કોઈ ઇતિહાસ ઉપલબ્ધ નથી.</div>
                )}
              </div>
            </div>
          )}

          {/* Family Module Tab */}
          {tab === "family" && (
            <div className="page-card family-panel animate-fade-in">
              <div className="panel-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' }}>
                <h2 style={{ color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                  👨‍👩‍👧‍👦 મારી ફેમિલી મોડ્યુલ (Family Management)
                </h2>
                <p className="panel-subtitle" style={{ margin: '5px 0 0 0' }}>
                  કુટુંબના મુખ્ય સભ્ય (Family Head) તરીકે તમારા ઘરના તમામ સભ્યોની માહિતી ઉમેરો અને મંજૂરી સ્થિતિ ચકાસો.
                </p>
              </div>

              {/* Family Summary Banner with Add Member Button */}
              <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)', border: '1.5px solid #bfdbfe', borderRadius: '12px', padding: '16px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.05rem' }}>
                    👑 કુટુંબના મોભી: <strong>{profile?.name || 'સમાજ સભ્ય'}</strong> ({profile?.village || 'ગામ'})
                  </h3>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    કુલ મંજૂર થયેલ સભ્યો: <strong>{1 + familyMembers.filter(m => m.status === 'approved').length} સભ્યો</strong> (૧ મોભી + {familyMembers.filter(m => m.status === 'approved').length} મંજૂર કુટુંબીજનો)
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ background: '#dbeafe', padding: '8px 16px', borderRadius: '20px', border: '1px solid #93c5fd', color: '#1e40af', fontWeight: '700', fontSize: '0.9rem' }}>
                    💰 ફંડ ચુકવણી સહાય: {(1 + familyMembers.filter(m => m.status === 'approved').length)} × ₹૫૦ = ₹{(1 + familyMembers.filter(m => m.status === 'approved').length) * 50}
                  </div>
                  <button
                    onClick={() => setShowAddFamilyModal(true)}
                    style={{
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      fontWeight: '700',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
                    }}
                  >
                    ➕ નવો પરિવાર સભ્ય ઉમેરો
                  </button>
                </div>
              </div>

              {/* Add Family Member Modal Popup */}
              {showAddFamilyModal && (
                <div className="add-death-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
                  <div className="add-death-modal-content" style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '600px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, color: '#1e3a8a', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ➕ નવો પરિવાર સભ્ય ઉમેરો (Add Family Member)
                      </h3>
                      <button onClick={() => setShowAddFamilyModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>×</button>
                    </div>

                    <form onSubmit={handleFamilyFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div className="form-grid-2col">
                        <div>
                          <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                            👤 સભ્યનું પૂરું નામ *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="દા.ત. રમેશભાઈ પરમાર"
                            value={familyForm.name}
                            onChange={(e) => setFamilyForm({ ...familyForm, name: e.target.value })}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', background: '#f8fafc' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                            🤝 સંબંધ (Relation) *
                          </label>
                          <select
                            value={familyForm.relation}
                            onChange={(e) => setFamilyForm({ ...familyForm, relation: e.target.value })}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', background: '#f8fafc' }}
                          >
                            <option value="Father">પિતા (Father)</option>
                            <option value="Mother">માતા (Mother)</option>
                            <option value="Wife">પત્ની (Wife)</option>
                            <option value="Husband">પતિ (Husband)</option>
                            <option value="Son">પુત્ર (Son)</option>
                            <option value="Daughter">પુત્રી (Daughter)</option>
                            <option value="Brother">ભાઈ (Brother)</option>
                            <option value="Sister">બહેન (Sister)</option>
                            <option value="Other">અન્ય (Other)</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-grid-2col">
                        <div>
                          <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                            🚻 જાતિ (Gender)
                          </label>
                          <select
                            value={familyForm.gender}
                            onChange={(e) => setFamilyForm({ ...familyForm, gender: e.target.value })}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', background: '#f8fafc' }}
                          >
                            <option value="Male">પુરુષ (Male)</option>
                            <option value="Female">મહિલા (Female)</option>
                            <option value="Other">અન્ય (Other)</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                            🎂 ઉંમર (Age in Years)
                          </label>
                          <input
                            type="number"
                            placeholder="દા.ત. 45"
                            value={familyForm.age}
                            onChange={(e) => setFamilyForm({ ...familyForm, age: e.target.value })}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', background: '#f8fafc' }}
                          />
                        </div>
                      </div>

                      <div className="form-grid-2col">
                        <div>
                          <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                            📞 મોબાઇલ નંબર (વૈકલ્પિક)
                          </label>
                          <input
                            type="tel"
                            placeholder="૧૦ આંકડાનો મોબાઇલ નંબર"
                            value={familyForm.mobile}
                            onChange={(e) => setFamilyForm({ ...familyForm, mobile: e.target.value })}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', background: '#f8fafc' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                            💼 વ્યવસાય / કામગીરી (Occupation)
                          </label>
                          <input
                            type="text"
                            placeholder="દા.ત. ખેતી, નોકરી, અભ્યાસ"
                            value={familyForm.occupation}
                            onChange={(e) => setFamilyForm({ ...familyForm, occupation: e.target.value })}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', background: '#f8fafc' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setShowAddFamilyModal(false)}
                          style={{ padding: '9px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                        >
                          રદ કરો
                        </button>
                        <button
                          type="submit"
                          disabled={familyLoading}
                          style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          {familyLoading ? "મોકલી રહ્યું છે..." : "💾 પરિવાર સભ્ય વિનંતી મોકલો"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Family Members List */}
              <div>
                <h3 style={{ color: '#0f172a', fontSize: '1.05rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📋 તમારા પરિવારના નોંધાયેલ સભ્યોની યાદી ({familyMembers.length + 1})
                </h3>

                {/* Primary Family Head Card */}
                <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#1e40af', background: '#dbeafe', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>👑 કુટુંબના મોભી (Family Head)</span>
                    <h4 style={{ margin: '4px 0 0 0', fontSize: '1.05rem', color: '#1e3a8a' }}>{profile?.name}</h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#475569' }}>📞 {profile?.mobile} • 🏘 {profile?.village}</p>
                  </div>
                  <span className="status-pill active" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>🟢 મુખ્ય સભ્ય (Active)</span>
                </div>

                {/* Desktop Table for Sub-Members */}
                <div className="table-scroll-container">
                  <table className="dashboard-table-premium">
                    <thead>
                      <tr>
                        <th>સભ્યનું નામ</th>
                        <th>સંબંધ</th>
                        <th>ઉંમર & જાતિ</th>
                        <th>મોબાઇલ / કામગીરી</th>
                        <th>મંજૂરી સ્થિતિ</th>
                        <th>ક્રિયા</th>
                      </tr>
                    </thead>
                    <tbody>
                      {familyMembers.map((m) => (
                        <tr key={m._id}>
                          <td><strong>{m.name}</strong></td>
                          <td><span className="village-badge-table">{m.relation}</span></td>
                          <td>{m.age ? `${m.age} વર્ષ` : '-'} • {m.gender}</td>
                          <td>{m.mobile ? `📞 ${m.mobile}` : (m.occupation || '-')}</td>
                          <td>
                            {m.status === 'approved' && <span className="status-pill active" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>🟢 મંજૂર (Approved)</span>}
                            {m.status === 'pending' && <span className="status-pill pending" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>⏳ વિનંતી બાકી (Pending)</span>}
                            {m.status === 'rejected' && (
                              <div>
                                <span className="status-pill pending" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>🔴 નામંજૂર (Rejected)</span>
                                {m.rejectionReason && <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#dc2626' }}>કારણ: {m.rejectionReason}</p>}
                              </div>
                            )}
                          </td>
                          <td>
                            <button onClick={() => handleDeleteFamilyMember(m._id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}>
                              🗑️ રદ કરો
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards for Sub-Members */}
                <div className="death-report-mobile-cards">
                  {familyMembers.map((m) => (
                    <div key={m._id} className="death-report-card">
                      <div className="death-report-card-header">
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>{m.name}</h4>
                          <span className="village-badge-table" style={{ marginTop: '4px', display: 'inline-block' }}>{m.relation}</span>
                        </div>
                        {m.status === 'approved' && <span className="status-pill active" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', fontSize: '0.75rem', padding: '2px 8px' }}>🟢 મંજૂર</span>}
                        {m.status === 'pending' && <span className="status-pill pending" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: '0.75rem', padding: '2px 8px' }}>⏳ બાકી</span>}
                        {m.status === 'rejected' && <span className="status-pill pending" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: '0.75rem', padding: '2px 8px' }}>🔴 નામંજૂર</span>}
                      </div>
                      <div className="death-report-card-body">
                        <div className="info-row"><span>🎂 ઉંમર & જાતિ:</span> <span>{m.age ? `${m.age} વર્ષ` : '-'} • {m.gender}</span></div>
                        {m.mobile && <div className="info-row"><span>📞 મોબાઇલ:</span> <strong>{m.mobile}</strong></div>}
                        {m.occupation && <div className="info-row"><span>💼 વ્યવસાય:</span> <span>{m.occupation}</span></div>}
                        {m.status === 'rejected' && m.rejectionReason && <div className="info-row" style={{ color: '#dc2626' }}><span>⚠️ નામંજૂર કારણ:</span> <strong>{m.rejectionReason}</strong></div>}
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                          <button onClick={() => handleDeleteFamilyMember(m._id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem', width: '100%' }}>
                            🗑️ વિનંતી રદ કરો
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Admin Family Approvals Tab */}
          {tab === "family_approvals" && (
            <div className="page-card pending-users-panel animate-fade-in">
              <div className="panel-header-flex" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' }}>
                <div className="panel-title-area">
                  <h2 style={{ color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                    👨‍👩‍👧‍👦 પરિવાર સભ્યોની મંજૂરીઓ ({familyRequests.filter(r => r.status === 'pending').length})
                  </h2>
                  <p className="panel-subtitle" style={{ margin: '5px 0 0 0' }}>
                    કુટુંબના મોભીઓ દ્વારા મોકલવામાં આવેલ નવ-ઉમેરાયેલ પરિવાર સભ્યોની ચકાસણી કરી મંજૂર અથવા નામંજૂર કરો.
                  </p>
                </div>
              </div>

              {familyRequests.filter(r => r.status === 'pending').length > 0 ? (
                <div className="pending-users-list">
                  {familyRequests.filter(r => r.status === 'pending').map((reqItem) => {
                    const isDup = checkIsDuplicate(reqItem);
                    return (
                      <div key={reqItem._id} className="pending-user-card" style={{ border: isDup ? '1.5px solid #f59e0b' : '1.5px solid #cbd5e1', borderRadius: '12px', padding: '16px', marginBottom: '14px', background: isDup ? '#fffbeb' : '#ffffff' }}>
                        {isDup && (
                          <div style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            ⚠️ સંભવિત ડુપ્લિકેટ સભ્ય (આ જ નામ/મોબાઇલ સભ્ય પહેલાંથી નોંધાયેલ છે)
                          </div>
                        )}
                        <div className="pending-user-info">
                          <div className="pending-user-avatar" style={{ background: '#dbeafe', color: '#1e40af' }}>
                            👨‍👩‍👧‍👦
                          </div>
                          <div className="pending-user-details">
                            <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>{reqItem.name} ({reqItem.relation})</h4>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#1e40af', fontWeight: '600' }}>
                              👑 મોભી: {reqItem.familyHead?.name || 'N/A'} (📞 <a href={`tel:${reqItem.familyHead?.mobile}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{reqItem.familyHead?.mobile} 📲 કોલ કરો</a> • 🏘 {reqItem.familyHead?.village})
                            </p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                              🎂 ઉંમર: {reqItem.age || '-'} વર્ષ • 🚻 જાતિ: {reqItem.gender} {reqItem.mobile ? `• 📞 ${reqItem.mobile}` : ''} {reqItem.occupation ? `• 💼 ${reqItem.occupation}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="pending-user-actions" style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                          <button onClick={() => setInspectItem({ ...reqItem, type: 'family' })} style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}>
                            🔍 વિગતો ચકાસો
                          </button>
                          <button
                            className="approve-btn-premium"
                            disabled={actionLoading}
                            onClick={() => handleFamilyApproval(reqItem._id, 'approved')}
                          >
                            ✅ મંજૂર કરો
                          </button>
                          <button
                            className="reject-btn-premium"
                            disabled={actionLoading}
                            onClick={() => {
                              setSelectedSubMember(reqItem);
                              setRejectModalOpen(true);
                            }}
                          >
                            ❌ નામંજૂર કરો
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-search-state" style={{ padding: "40px 20px" }}>
                  <div className="empty-icon">👨‍👩‍👧‍👦</div>
                  <p>હાલમાં કોઈ નવી પરિવાર સભ્ય મંજૂરી વિનંતીઓ બાકી નથી.</p>
                </div>
              )}

              {/* Rejection Reason Modal */}
              {rejectModalOpen && selectedSubMember && (
                <div className="add-death-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                  <div className="add-death-modal-content" style={{ background: '#ffffff', padding: '24px', borderRadius: '14px', width: '90%', maxWidth: '450px' }}>
                    <h3 style={{ margin: '0 0 12px 0', color: '#dc2626' }}>❌ પરિવાર સભ્ય નામંજૂર કરો</h3>
                    <p style={{ margin: '0 0 14px 0', fontSize: '0.9rem', color: '#475569' }}>
                      સભ્ય: <strong>{selectedSubMember.name}</strong> ({selectedSubMember.relation})<br />
                      મોભી: {selectedSubMember.familyHead?.name}
                    </p>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px' }}>નામંજૂર કરવાનું ચોક્કસ કારણ:</label>
                    <input
                      type="text"
                      placeholder="દા.ત. અયોગ્ય સંબંધ અથવા અધૂરા દસ્તાવેજ"
                      value={rejectionReasonInput}
                      onChange={(e) => setRejectionReasonInput(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px', fontSize: '0.9rem' }}
                    />
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setRejectModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f1f5f9', cursor: 'pointer' }}>રદ કરો</button>
                      <button onClick={() => handleFamilyApproval(selectedSubMember._id, 'rejected', rejectionReasonInput)} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}>નામંજૂર સાચવો</button>
                    </div>
                  </div>
                </div>
              )}

              {/* ───── Family History Section ───── */}
              <div style={{ marginTop: '32px', borderTop: '2px dashed #e2e8f0', paddingTop: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📋 ઇતિહાસ — સ્વીકૃત / નામંજૂર પ.સ.-નોંધ
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.83rem', color: '#64748b' }}>અત્યાર સુધી મંજૂર અથવા નામંજૂર કરાયેલ પરિવાર સભ્ય-નોંધ</p>
                  </div>
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700', border: '1px solid #e2e8f0' }}>
                    કુલ: {familyHistory.length} નોંધ
                  </span>
                </div>

                {familyHistory.length > 0 ? (() => {
                  const fhTotal = Math.ceil(familyHistory.length / HISTORY_PAGE_SIZE);
                  const fhSlice = familyHistory.slice((familyHistoryPage - 1) * HISTORY_PAGE_SIZE, familyHistoryPage * HISTORY_PAGE_SIZE);
                  return (
                    <>
                      <div className="hist-table-wrap">
                        <table className="history-log-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>સભ્ય નામ</th>
                              <th>સંબંધ</th>
                              <th>મોભી</th>
                              <th>ગામ</th>
                              <th>નિર્ણય</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fhSlice.map((r, i) => (
                              <tr key={r._id}>
                                <td style={{ color: '#94a3b8', fontWeight: 600 }}>{(familyHistoryPage - 1) * HISTORY_PAGE_SIZE + i + 1}</td>
                                <td><strong>{r.name}</strong></td>
                                <td><span className="village-badge-table">{r.relation}</span></td>
                                <td>{r.familyHead?.name || '—'}</td>
                                <td>{r.familyHead?.village || '—'}</td>
                                <td>
                                  {r.status === 'approved'
                                    ? <span className="hist-badge-approved">✅ મંજૂર</span>
                                    : <span className="hist-badge-rejected">❌ નામંજૂર</span>}
                                  {r.status === 'rejected' && r.rejectionReason && (
                                    <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: '#dc2626' }}>↳ {r.rejectionReason}</p>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="hist-mobile-cards">
                        {fhSlice.map((r) => (
                          <div key={r._id} className={`hist-card ${r.status === 'approved' ? 'hist-card-approved' : 'hist-card-rejected'}`}>
                            <div className="hist-card-top">
                              <span className="hist-card-name">{r.name} <small style={{ color: '#94a3b8' }}>({r.relation})</small></span>
                              {r.status === 'approved'
                                ? <span className="hist-badge-approved">✅ மங்குர</span>
                                : <span className="hist-badge-rejected">❌ નામંજૂર</span>}
                            </div>
                            <div className="hist-card-row"><span>👑 મોભી:</span><span>{r.familyHead?.name || '—'}</span></div>
                            <div className="hist-card-row"><span>🏘 ગામ:</span><span>{r.familyHead?.village || '—'}</span></div>
                            {r.status === 'rejected' && r.rejectionReason && (
                              <div className="hist-card-row" style={{ color: '#dc2626' }}><span>⚠️ કારણ:</span><span>{r.rejectionReason}</span></div>
                            )}
                          </div>
                        ))}
                      </div>

                      {fhTotal > 1 && (
                        <div className="hist-pagination">
                          <button className="hist-pg-btn" disabled={familyHistoryPage <= 1} onClick={() => setFamilyHistoryPage(p => p - 1)}>◄ પાછળ</button>
                          {Array.from({ length: fhTotal }, (_, idx) => (
                            <button key={idx} className={`hist-pg-num ${familyHistoryPage === idx + 1 ? 'active' : ''}`} onClick={() => setFamilyHistoryPage(idx + 1)}>{idx + 1}</button>
                          ))}
                          <button className="hist-pg-btn" disabled={familyHistoryPage >= fhTotal} onClick={() => setFamilyHistoryPage(p => p + 1)}>આગળ ►</button>
                        </div>
                      )}
                    </>
                  );
                })() : (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '0.9rem' }}>📭 હજી કોઈ ઇતિહાસ ઉપલબ્ધ નથી.</div>
                )}
              </div>
            </div>
          )}

          {/* Admin Family Directory Split View Tab */}
          {tab === "family_directory" && (
            <div className="page-card family-directory-panel animate-fade-in">
              <div className="panel-header-flex" style={{ borderBottom: '1.5px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '1.4rem' }}>
                    👨‍👩‍👧‍👦 પરગણા કૌટુંબિક ડાયરેક્ટરી & વસ્તી પત્રક
                  </h2>
                  <p className="panel-subtitle" style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                    સમાજના તમામ કૌટુંબિક મોભીઓ અને તેમના પરગણા પરિવારના જોડાયેલા સભ્યોનું સંપૂર્ણ પત્રક
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="search-wrapper" style={{ position: 'relative', height: '42px', margin: 0, width: '260px' }}>
                    <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#94a3b8' }}>
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      className="search-box-premium"
                      placeholder="મોભી, સભ્ય કે ગામથી શોધો..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ width: '100%', height: '42px', padding: '8px 12px 8px 38px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Summary Metrics Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px 18px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: '700', display: 'block' }}>👑 કુલ કૌટુંબિક મોભીઓ</span>
                  <h3 style={{ margin: '4px 0 0 0', color: '#1e3a8a', fontSize: '1.4rem', fontWeight: '800' }}>
                    {familyDirectory.length} કુટુંબો
                  </h3>
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px 18px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: '700', display: 'block' }}>👨‍👩‍👧‍👦 નોંધાયેલ પરિજનો (Sub-Members)</span>
                  <h3 style={{ margin: '4px 0 0 0', color: '#14532d', fontSize: '1.4rem', fontWeight: '800' }}>
                    {familyDirectory.reduce((acc, f) => acc + (f.subMembers ? f.subMembers.filter(m => m.status === 'approved').length : 0), 0)} સભ્યો
                  </h3>
                </div>

                <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '14px 18px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#6b21a8', fontWeight: '700', display: 'block' }}>🌐 સમાજ કુલ વસ્તી (Population)</span>
                  <h3 style={{ margin: '4px 0 0 0', color: '#581c87', fontSize: '1.4rem', fontWeight: '800' }}>
                    {familyDirectory.reduce((acc, f) => acc + (f.totalFamilyCount || 1), 0)} સભ્યો
                  </h3>
                </div>
              </div>

              {/* Master-Detail Split Grid */}
              {(() => {
                const filteredList = familyDirectory.filter(item => {
                  if (!search) return true;
                  const s = search.toLowerCase();
                  const headMatch = (item.name || "").toLowerCase().includes(s) || (item.village || "").toLowerCase().includes(s) || (item.mobile || "").includes(s);
                  const subMatch = item.subMembers && item.subMembers.some(m => (m.name || "").toLowerCase().includes(s));
                  return headMatch || subMatch;
                });

                const dirItemsPerPage = 5;
                const totalDirPages = Math.ceil(filteredList.length / dirItemsPerPage) || 1;
                const activeDirPage = Math.min(directoryCurrentPage, totalDirPages);
                const paginatedList = filteredList.slice((activeDirPage - 1) * dirItemsPerPage, activeDirPage * dirItemsPerPage);
                const activeHead = filteredList.find(f => f._id === selectedDirectoryHeadId) || paginatedList[0] || filteredList[0];

                if (filteredList.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '50px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                      <div style={{ fontSize: '2.5rem' }}>👨‍👩‍👧‍👦</div>
                      <p style={{ color: '#64748b', margin: '10px 0 0 0' }}>કોઈ કૌટુંબિક માહિતી મળેલ નથી.</p>
                    </div>
                  );
                }

                return (
                  <div className="family-split-container" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', minHeight: '520px' }}>
                    {/* Left Column: Family Heads List */}
                    <div className="family-heads-master-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '0.88rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        👑 કુટુંબ મોભીઓની યાદી ({filteredList.length})
                      </h4>
                      {paginatedList.map((item) => {
                        const isSelected = activeHead && activeHead._id === item._id;
                        const approvedSubCount = item.subMembers ? item.subMembers.filter(m => m.status === 'approved').length : 0;
                        const pendingSubCount = item.subMembers ? item.subMembers.filter(m => m.status === 'pending').length : 0;

                        return (
                          <div
                            key={item._id}
                            onClick={() => setSelectedDirectoryHeadId(item._id)}
                            style={{
                              padding: '14px',
                              borderRadius: '12px',
                              border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                              background: isSelected ? '#eff6ff' : '#ffffff',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.12)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <h4 style={{ margin: 0, fontSize: '0.98rem', color: isSelected ? '#1e40af' : '#0f172a', fontWeight: '700' }}>
                                👑 {item.name}
                              </h4>
                              <span style={{ fontSize: '0.75rem', background: isSelected ? '#dbeafe' : '#f1f5f9', color: isSelected ? '#1e40af' : '#475569', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                                {1 + approvedSubCount} સભ્યો
                              </span>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.83rem', color: '#64748b' }}>
                              🏘 {item.village} • 📞 {item.mobile}
                            </p>
                            {pendingSubCount > 0 && (
                              <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                                ⏳ {pendingSubCount} મંજૂરી બાકી
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Pagination Controls for Family Directory */}
                      {totalDirPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', padding: '8px 10px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <button
                            disabled={activeDirPage === 1}
                            onClick={() => setDirectoryCurrentPage(prev => Math.max(prev - 1, 1))}
                            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: activeDirPage === 1 ? '#f1f5f9' : '#ffffff', color: activeDirPage === 1 ? '#94a3b8' : '#1e3a8a', cursor: activeDirPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.78rem' }}
                          >
                            ◄ પાછળ
                          </button>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>
                            {activeDirPage} / {totalDirPages}
                          </span>
                          <button
                            disabled={activeDirPage === totalDirPages}
                            onClick={() => setDirectoryCurrentPage(prev => Math.min(prev + 1, totalDirPages))}
                            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: activeDirPage === totalDirPages ? '#f1f5f9' : '#ffffff', color: activeDirPage === totalDirPages ? '#94a3b8' : '#1e3a8a', cursor: activeDirPage === totalDirPages ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.78rem' }}
                          >
                            આગળ ►
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Detailed Family Tree Inspector */}
                    {activeHead ? (
                      <div className="family-tree-detail-panel" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Family Head Banner */}
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#1e3a8a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: '800' }}>
                              👑
                            </div>
                            <div>
                              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem' }}>{activeHead.name}</h3>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                                👑 કુટુંબના મોભી • 🏘 {activeHead.village} • 📞 <a href={`tel:${activeHead.mobile}`} style={{ color: '#2563eb', fontWeight: '700', textDecoration: 'none' }}>{activeHead.mobile} 📲 (કોલ કરો)</a>
                              </p>
                            </div>
                          </div>
                          <div style={{ background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd', padding: '8px 16px', borderRadius: '10px', fontWeight: '800', fontSize: '0.95rem' }}>
                            👨‍👩‍👧‍👦 પરગણા કૌટુંબિક ફંડ: <strong>{activeHead.totalFamilyCount} સભ્યો</strong>
                          </div>
                        </div>

                        {/* Sub-members List Section */}
                        <div>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '1.05rem', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            👨‍👩‍👧‍👦 કુટુંબના તમામ જોડાયેલા પરિજનો ({activeHead.subMembers ? activeHead.subMembers.length : 0})
                          </h4>

                          {activeHead.subMembers && activeHead.subMembers.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {activeHead.subMembers.map((subM) => (
                                <div key={subM._id} style={{ background: '#ffffff', border: subM.status === 'approved' ? '1px solid #cbd5e1' : '1.5px solid #f59e0b', borderRadius: '10px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '1.3rem' }}>
                                      {subM.relation === 'Father' || subM.relation === 'Mother' ? '👴' : subM.relation === 'Wife' ? '👩' : subM.relation === 'Son' ? '👦' : '👧'}
                                    </span>
                                    <div>
                                      <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#0f172a' }}>{subM.name}</h4>
                                      <p style={{ margin: '2px 0 0 0', fontSize: '0.83rem', color: '#64748b' }}>
                                        🤝 સંબંધ: <strong>{subM.relation}</strong> • 🎂 ઉંમર: {subM.age || '-'} વર્ષ • 🚻 જાતિ: {subM.gender} {subM.occupation ? `• 💼 ${subM.occupation}` : ''} {subM.mobile ? `• 📞 ${subM.mobile}` : ''}
                                      </p>
                                    </div>
                                  </div>

                                  <div>
                                    {subM.status === 'approved' ? (
                                      <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '700' }}>
                                        ✅ મંજૂર થયેલ
                                      </span>
                                    ) : subM.status === 'pending' ? (
                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        <button onClick={() => handleFamilyApproval(subM._id, 'approved')} style={{ background: '#166534', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>
                                          ✅ મંજૂર કરો
                                        </button>
                                        <button onClick={() => { setSelectedSubMember(subM); setRejectModalOpen(true); }} style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>
                                          ❌ નામંજૂર
                                        </button>
                                      </div>
                                    ) : (
                                      <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '700' }}>
                                        ❌ નામંજૂર ({subM.rejectionReason || 'અમાન્ય'})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '24px', textAlign: 'center', color: '#64748b' }}>
                              💡 આ મોભી સાથે હજુ કોઈ અન્ય કૌટુંબિક સભ્ય ઉમેરાયેલ નથી. (માત્ર મોભી પોતે ૧ સભ્ય ગણાશે)
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Community Members List Tab */}
          {tab === "members" && (() => {
            const itemsPerPage = 10;
            const filteredMembers = members.filter(m =>
              !search || (m.name && m.name.toLowerCase().includes(search.toLowerCase())) ||
              (m.village && m.village.toLowerCase().includes(search.toLowerCase())) ||
              (m.mobile && m.mobile.includes(search))
            );
            const totalPages = Math.ceil(filteredMembers.length / itemsPerPage) || 1;
            const activePage = Math.min(memberCurrentPage, totalPages);
            const paginatedMembers = filteredMembers.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

            return (
              <div className="page-card table-panel animate-fade-in">
                {/* Header */}
                <div className="panel-header-flex" style={{ borderBottom: '1.5px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '1.4rem' }}>
                      👥 સભ્ય યાદી
                    </h2>
                    <p className="panel-subtitle" style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                      પંચશીલ સમાજના તમામ મંજૂર સભ્યોની સૂચિ
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '8px 16px', fontWeight: '700', color: '#1e40af', fontSize: '0.9rem' }}>
                      કુલ: {members.length} સભ્ય
                    </div>
                    <div className="search-wrapper" style={{ position: 'relative', height: '42px', margin: 0, width: '240px' }}>
                      <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#94a3b8' }}>
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        className="search-box-premium"
                        placeholder="નામ, ગામ, ફોન શોધો..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setMemberCurrentPage(1); }}
                        style={{ width: '100%', height: '42px', padding: '8px 12px 8px 38px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                      />
                    </div>
                  </div>
                </div>

                {filteredMembers.length === 0 ? (
                  <div className="empty-search-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '12px' }}>🔍</div>
                    <p style={{ color: '#64748b', fontSize: '1rem' }}>કોઈ સભ્ય મળ્યા નહીં. કૃપા કરીને અલગ શોધ કરો.</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="table-responsive-desktop">
                      <table className="dashboard-table-premium">
                        <thead>
                          <tr>
                            <th style={{ width: '50px' }}>#</th>
                            <th>સભ્યનું નામ</th>
                            <th>મોબાઇલ નંબર</th>
                            <th>ગામ</th>
                            <th>ઉંમર</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedMembers.map((m, idx) => (
                            <tr key={m._id}>
                              <td style={{ color: '#94a3b8', fontWeight: 600 }}>{(activePage - 1) * itemsPerPage + idx + 1}</td>
                              <td className="member-name-cell">
                                <div className="member-avatar-mini">{m.name ? m.name.charAt(0) : '?'}</div>
                                <span className="member-name-text">{m.name}</span>
                              </td>
                              <td className="phone-cell"><span>📞</span> {m.mobile || '—'}</td>
                              <td><span className="village-badge-table">{m.village || '—'}</span></td>
                              <td>{m.age ? `${m.age} વર્ષ` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="table-responsive-mobile">
                      <div className="member-cards-grid">
                        {paginatedMembers.map((m) => (
                          <div key={m._id} className="member-mobile-card">
                            <div className="member-mobile-card-header">
                              <div className="member-avatar-mini">{m.name ? m.name.charAt(0) : '?'}</div>
                              <h4>{m.name}</h4>
                            </div>
                            <div className="member-mobile-card-body">
                              <div className="info-row"><span>📞 ફોન:</span><strong>{m.mobile || '—'}</strong></div>
                              <div className="info-row"><span>🏘️ ગામ:</span><span className="village-badge-table">{m.village || '—'}</span></div>
                              {m.age && <div className="info-row"><span>🎂 ઉંમર:</span><span>{m.age} વર્ષ</span></div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #cbd5e1', flexWrap: 'wrap', gap: '10px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>
                          કુલ <strong>{filteredMembers.length}</strong> સભ્યો માંથી <strong>{(activePage - 1) * itemsPerPage + 1} - {Math.min(activePage * itemsPerPage, filteredMembers.length)}</strong> બતાવ્યા (પૃષ્ઠ {activePage} / {totalPages})
                        </span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            disabled={activePage === 1}
                            onClick={() => setMemberCurrentPage(prev => Math.max(prev - 1, 1))}
                            style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: activePage === 1 ? '#f1f5f9' : '#ffffff', color: activePage === 1 ? '#94a3b8' : '#1e3a8a', cursor: activePage === 1 ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                          >
                            ← પાછળ
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                            <button
                              key={pg}
                              onClick={() => setMemberCurrentPage(pg)}
                              style={{ padding: '6px 12px', borderRadius: '6px', border: pg === activePage ? '1.5px solid #2563eb' : '1px solid #cbd5e1', background: pg === activePage ? '#2563eb' : '#ffffff', color: pg === activePage ? '#ffffff' : '#475569', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                            >
                              {pg}
                            </button>
                          ))}
                          <button
                            disabled={activePage === totalPages}
                            onClick={() => setMemberCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: activePage === totalPages ? '#f1f5f9' : '#ffffff', color: activePage === totalPages ? '#94a3b8' : '#1e3a8a', cursor: activePage === totalPages ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                          >
                            આગળ →
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* Profile Tab */}
          {tab === "profile" && (
            <div className="page-card profile-card-view">
              <div className="profile-header-decor"></div>
              {!isEditing ? (
                <div className="profile-container">
                  <div className="profile-sidebar">
                    <div 
                      className="profile-avatar-large interactive-avatar" 
                      onClick={handleOpenAvatarModal}
                      title="પ્રોફાઇલ ફોટો બદલો / અપલોડ કરો"
                    >
                      {profile?.avatar ? (
                        <img src={profile.avatar} alt="Profile" className="profile-avatar-img" />
                      ) : (
                        <>
                          <span>{profile?.name ? profile.name.charAt(0).toUpperCase() : "👤"}</span>
                          <div className="avatar-camera-badge" title="ફોટો ઉમેરો">
                            📷
                          </div>
                        </>
                      )}
                    </div>
                    <h3>{profile?.name}</h3>
                    <span className="profile-badge">સક્રિય સભ્ય</span>
                    <button className="edit-profile-btn" onClick={handleStartEdit}>✏️ માહિતી સુધારો</button>
                  </div>
                  <div className="profile-details-grid">
                    <div className="profile-detail-item"><span className="detail-label">👤 પૂરું નામ</span><span className="detail-value">{profile?.name || "N/A"}</span></div>
                    <div className="profile-detail-item"><span className="detail-label">📞 મોબાઇલ નંબર</span><span className="detail-value">{profile?.mobile || "N/A"}</span></div>
                    <div className="profile-detail-item"><span className="detail-label">🏘 ગામ</span><span className="detail-value">{profile?.village || "N/A"}</span></div>
                    <div className="profile-detail-item"><span className="detail-label">🎂 ઉંમર</span><span className="detail-value">{profile?.age ? `${profile.age} વર્ષ` : "N/A"}</span></div>
                    <div className="profile-detail-item full-width"><span className="detail-label">✉️ ઈ-મેઈલ સરનામું</span><span className="detail-value">{profile?.email || "ઉપલબ્ધ નથી"}</span></div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="profile-container">
                  <div className="profile-sidebar">
                    <div 
                      className="profile-avatar-large interactive-avatar" 
                      onClick={handleOpenAvatarModal}
                      title="પ્રોફાઇલ ફોટો બદલો / અપલોડ કરો"
                    >
                      {profile?.avatar ? (
                        <img src={profile.avatar} alt="Profile" className="profile-avatar-img" />
                      ) : (
                        <>
                          <span>{profile?.name ? profile.name.charAt(0).toUpperCase() : "👤"}</span>
                          <div className="avatar-camera-badge" title="ફોટો ઉમેરો">
                            📷
                          </div>
                        </>
                      )}
                    </div>
                    <h3>માહિતી સુધારો</h3>
                    <div className="profile-edit-actions">
                      <button type="submit" className="save-profile-btn" disabled={profileLoading}>{profileLoading ? "સાચવી રહ્યું..." : "💾 સાચવો"}</button>
                      <button type="button" className="cancel-profile-btn" onClick={() => setIsEditing(false)}>❌ રદ કરો</button>
                    </div>
                  </div>
                  <div className="profile-details-grid">
                    {profileError && <div className="profile-alert error">{profileError}</div>}
                    {profileSuccess && <div className="profile-alert success">{profileSuccess}</div>}
                    <div className="profile-detail-item edit-mode"><span className="detail-label">👤 પૂરું નામ *</span><input className="profile-edit-input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></div>
                    <div className="profile-detail-item edit-mode"><span className="detail-label">📞 મોબાઇલ નંબર *</span><input className="profile-edit-input" value={editForm.mobile} onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} required /></div>
                    <div className="profile-detail-item edit-mode"><span className="detail-label">🏘 ગામ *</span><input className="profile-edit-input" value={editForm.village} onChange={(e) => setEditForm({ ...editForm, village: e.target.value })} required /></div>
                    <div className="profile-detail-item edit-mode"><span className="detail-label">🎂 ઉંમર *</span><input className="profile-edit-input" type="number" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} required /></div>
                    <div className="profile-detail-item full-width edit-mode"><span className="detail-label">✉️ ઈ-મેઈલ સરનામું</span><input className="profile-edit-input" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="ઈમેઇલ (વૈકલ્પિક)" /></div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {tab === "settings" && (
            <div className="page-card settings-panel-card animate-fade-in">
              <div className="settings-header-banner">
                <div className="settings-title-group">
                  <h2>⚙️ {language === "en" ? "System Settings" : "સિસ્ટમ સેટિંગ્સ"}</h2>
                  <p>{language === "en" ? "Customize your language preferences, layout appearance, and display modes." : "તમારી ભાષા પસંદગી અને ડિસ્પ્લે થીમ સેટિંગ્સ બદલો."}</p>
                </div>
              </div>

              <div className="settings-sections-grid">
                {/* Language Selection Card */}
                <div className="settings-card-item">
                  <div className="settings-card-header">
                    <div className="settings-card-icon">🌐</div>
                    <div>
                      <h3>{language === "en" ? "App Language" : "એપ્લિકેશન ભાષા"}</h3>
                      <p>{language === "en" ? "Select your preferred display language" : "તમારી અનુકૂળતા મુજબ ભાષા પસંદ કરો"}</p>
                    </div>
                  </div>

                  <div className="settings-option-buttons">
                    <button 
                      type="button" 
                      className={`lang-option-btn ${language === "gu" ? "active" : ""}`}
                      onClick={() => handleLanguageChange("gu")}
                    >
                      <span className="flag-icon">🇮🇳</span>
                      <div className="lang-text">
                        <strong>ગુજરાતી</strong>
                        <span>Gujarati (ડિફોલ્ટ)</span>
                      </div>
                      {language === "gu" && <span className="active-check">✓</span>}
                    </button>

                    <button 
                      type="button" 
                      className={`lang-option-btn ${language === "en" ? "active" : ""}`}
                      onClick={() => handleLanguageChange("en")}
                    >
                      <span className="flag-icon">🌐</span>
                      <div className="lang-text">
                        <strong>English</strong>
                        <span>અંગ્રેજી ભાષા</span>
                      </div>
                      {language === "en" && <span className="active-check">✓</span>}
                    </button>
                  </div>
                </div>

                {/* Theme & Layout Selection Card */}
                <div className="settings-card-item">
                  <div className="settings-card-header">
                    <div className="settings-card-icon">🎨</div>
                    <div>
                      <h3>{language === "en" ? "Display Theme & Layout" : "લેઆઉટ થીમ અને ડિસ્પ્લે"}</h3>
                      <p>{language === "en" ? "Choose color theme and layout density" : "કલર થીમ અને કમ્પેક્ટ મોડ પસંદ કરો"}</p>
                    </div>
                  </div>

                  <div className="settings-theme-grid">
                    <button 
                      type="button" 
                      className={`theme-card-btn ${theme === "light" ? "active" : ""}`}
                      onClick={() => handleThemeChange("light")}
                    >
                      <div className="theme-preview light">
                        <span className="preview-sun">☀️</span>
                      </div>
                      <div className="theme-info">
                        <strong>{language === "en" ? "Light Mode" : "લાઇટ મોડ"}</strong>
                        <span>{language === "en" ? "Standard bright view" : "સામાન્ય લાઇટ લુક"}</span>
                      </div>
                    </button>

                    <button 
                      type="button" 
                      className={`theme-card-btn ${theme === "dark" ? "active" : ""}`}
                      onClick={() => handleThemeChange("dark")}
                    >
                      <div className="theme-preview dark">
                        <span className="preview-moon">🌙</span>
                      </div>
                      <div className="theme-info">
                        <strong>{language === "en" ? "Dark Mode" : "ડાર્ક મોડ"}</strong>
                        <span>{language === "en" ? "Sleek dark design" : "આંખો માટે અનુકૂળ ડાર્ક વ્યુ"}</span>
                      </div>
                    </button>

                    <button 
                      type="button" 
                      className={`theme-card-btn ${theme === "compact" ? "active" : ""}`}
                      onClick={() => handleThemeChange("compact")}
                    >
                      <div className="theme-preview compact">
                        <span className="preview-grid">📱</span>
                      </div>
                      <div className="theme-info">
                        <strong>{language === "en" ? "Compact Mode" : "કમ્પેક્ટ મોડ"}</strong>
                        <span>{language === "en" ? "High density layout" : "વધુ માહિતી કમ્પેક્ટ રૂપે"}</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Community Summary Tab */}
          {tab === "community" && (
            <div className="community-tab-wrapper">
              {/* Hero Banner */}
              <div className="community-hero-banner">
                <div className="community-hero-content">
                  <div className="community-hero-badge">🌐 પંચશીલ સમાજ</div>
                  <h1 className="community-hero-title">સ્વાગત છે, {profile?.name?.split(" ")[0] || "સભ્ય"}!</h1>
                  <p className="community-hero-subtitle">
                    આ પ્લેટફોર્મ પર આપ સૌ સમાજ સભ્યોની માહિતી, ગામ-સૂચિ, <br/>
                    અને ફંડ-ની વ્યવસ્થા એક જ સ્થળે ઉપલબ્ધ છે.
                  </p>
                </div>
                <div className="community-hero-illustration">🏛️</div>
              </div>

              {/* Stat Cards Row */}
              <div className="community-stat-row">
                <div className="comm-stat-card comm-stat-blue">
                  <div className="comm-stat-icon">👥</div>
                  <div className="comm-stat-body">
                    <span className="comm-stat-label">કુલ સભ્યો</span>
                    <span className="comm-stat-value">{(summary.totalMembers || payment.totalMembers || 0).toLocaleString('gu-IN')}</span>
                  </div>
                  <div className="comm-stat-glow"></div>
                </div>
                <div className="comm-stat-card comm-stat-green">
                  <div className="comm-stat-icon">🏘</div>
                  <div className="comm-stat-body">
                    <span className="comm-stat-label">જોડાયેલ ગામો</span>
                    <span className="comm-stat-value">{(summary.totalVillages || (summary.villages || []).length || 0).toLocaleString('gu-IN')}</span>
                  </div>
                  <div className="comm-stat-glow"></div>
                </div>
                <div className="comm-stat-card comm-stat-purple">
                  <div className="comm-stat-icon">🤝</div>
                  <div className="comm-stat-body">
                    <span className="comm-stat-label">સહાય ફંડ</span>
                    <span className="comm-stat-value">₹50/સભ્ય</span>
                  </div>
                  <div className="comm-stat-glow"></div>
                </div>
                <div className="comm-stat-card comm-stat-orange">
                  <div className="comm-stat-icon">🛡️</div>
                  <div className="comm-stat-body">
                    <span className="comm-stat-label">સ્ટેટ્સ</span>
                    <span className="comm-stat-value" style={{ color: '#10b981', fontSize: '1rem' }}>● સક્રિય</span>
                  </div>
                  <div className="comm-stat-glow"></div>
                </div>
              </div>

              {/* Village Grid */}
              <div className="community-villages-card">
                <div className="village-card-header">
                  <div>
                    <h2 className="village-card-title">🏘 જોડાયેલા ગામોની યાદી</h2>
                    <p className="village-card-sub">પંચશીલ સમાજ સાથે જોડાયેલ તમામ ગામ</p>
                  </div>
                  <div className="village-count-pill">{(summary.villages || []).length} ગામ</div>
                </div>
                <div className="village-grid">
                  {(summary.villages || []).map((v, index) => {
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];
                    const color = colors[index % colors.length];
                    return (
                      <div key={v} className="village-grid-card" style={{ '--village-color': color }}>
                        <div className="village-grid-number">{index + 1}</div>
                        <div className="village-grid-icon" style={{ background: `${color}18`, color }}>🏠</div>
                        <div className="village-grid-name">{v}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* About Section */}
              <div className="community-about-card">
                <div className="about-left">
                  <span className="about-tag">📖 અમારા વિશે</span>
                  <h3 className="about-title">પંચશીલ સમાજ — એક સૂત્ર, એક ઉદ્દેશ</h3>
                  <p className="about-desc">
                    ?????? ???? ? ????? ????? ???-???? ??? ??????? ??? ???????
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Villages List Tab */}
          {tab === "villages" && (
            <div className="page-card table-panel">
              <div className="panel-header-flex">
                <div className="panel-title-area">
                  <h2>🏘 ગામોની યાદી</h2>
                  <p className="panel-subtitle">પંચશીલ સમાજના સભ્ય ગામો અને સભ્ય સંખ્યા</p>
                </div>
                <div className="search-wrapper">
                  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input className="search-box-premium" placeholder="ગામનું નામ શોધો..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>

              {villages.filter(v => matchesSearch(v, search)).length > 0 ? (
                <div className="villages-grid-premium">
                  {villages.filter(v => matchesSearch(v, search)).map((v) => {
                    const maxMembers = Math.max(...villages.map(item => item.members), 1);
                    const percentage = Math.min(100, Math.round((v.members / maxMembers) * 100));
                    return (
                      <div key={v.name} className="village-premium-card">
                        <div className="village-card-header"><span>🏘</span><h3>{v.name}</h3></div>
                        <div className="village-card-body">
                          <div className="member-count-row"><span>સભ્યોની સંખ્યા:</span><span className="member-count-badge">{v.members} સભ્યો</span></div>
                          <div className="village-progress-bar-container"><div className="village-progress-bar-fill" style={{ width: `${percentage}%` }}></div></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-search-state"><div className="empty-icon">🏘</div><p>કોઈ ગામ મળ્યું નથી.</p></div>
              )}
            </div>
          )}

          {/* Admin Add Death Event Tab (Separate Sidebar Option) */}
          {tab === "add_death_event" && (
            <div className="page-card add-death-panel animate-fade-in">
              <div className="panel-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h2 style={{ color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                      ➕ નવી સદગત મરણ નોંધ ઉમેરો
                    </h2>
                    <p className="panel-subtitle" style={{ margin: '5px 0 0 0' }}>
                      મૃત્યુ પામેલ સભ્યની માહિતી અને છેલ્લી તારીખ ઉમેરીને નવા સહાય ફંડની જાહેરાત કરો
                    </p>
                  </div>
                  <span style={{ background: '#dbeafe', color: '#1e40af', fontWeight: '700', padding: '6px 16px', borderRadius: '20px', border: '1px solid #bfdbfe' }}>
                    👑 એડમિન એન્ટ્રી ફોર્મ
                  </span>
                </div>
              </div>

              {/* Form Card */}
              <div className="add-death-panel-form-card" style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '14px', padding: '24px', maxWidth: '650px', margin: '0 auto 30px auto', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <form onSubmit={handleAddDeathSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                      👤 સ્વર્ગસ્થ સભ્યનું પૂરું નામ *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="દા.ત. શ્રી રમેશભાઈ પરમાર"
                      value={deathForm.name}
                      onChange={(e) => setDeathForm({ ...deathForm, name: e.target.value })}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', background: '#f8fafc' }}
                    />
                  </div>

                  <div className="form-grid-2col">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                        🏘 સભ્યનું ગામ (Registered Village) *
                      </label>
                      <select
                        required
                        value={deathForm.village}
                        onChange={(e) => setDeathForm({ ...deathForm, village: e.target.value })}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', background: '#ffffff', cursor: 'pointer' }}
                      >
                        <option value="">-- નોંધાયેલ ગામ પસંદ કરો --</option>
                        {availableVillages.map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                        📅 મૃત્યુ તારીખ (Calendar) *
                      </label>
                      <input
                        type="date"
                        required
                        value={deathForm.deathDate}
                        onChange={(e) => setDeathForm({ ...deathForm, deathDate: e.target.value })}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', background: '#ffffff', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2col">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                        ⏳ ચુકવણીની અંતિમ તારીખ (Calendar Due Date) *
                      </label>
                      <input
                        type="date"
                        required
                        value={deathForm.dueDate}
                        onChange={(e) => setDeathForm({ ...deathForm, dueDate: e.target.value })}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', background: '#ffffff', cursor: 'pointer' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                        💰 સહાય ફંડ રકમ (પ્રતિ સભ્ય)
                      </label>
                      <input
                        type="number"
                        required
                        value={deathForm.amount}
                        onChange={(e) => setDeathForm({ ...deathForm, amount: Number(e.target.value) })}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', background: '#f8fafc' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '10px' }}>
                    <button
                      type="submit"
                      disabled={deathLoading}
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '1.05rem',
                        boxShadow: '0 4px 12px rgba(30,58,138,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {deathLoading ? "સાચવી રહ્યું..." : "💾 સહાય ફંડ સત્તાવાર રીતે જાહેર કરો"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Recently Active Death Events List */}
              <div style={{ marginTop: '30px' }}>
                <h3 style={{ color: '#1e293b', fontSize: '1.1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📋 તાજેતરમાં જાહેર કરેલ સહાય ફંડ ની યાદી
                </h3>
                <div className="scroll-hint-bar">👈 ડાબે-જમણે સ્ક્રૉલ કરો (Scroll Side-to-Side) 👉</div>

                {(() => {
                  const itemsPerPage = 5;
                  const totalEvents = pendingDeaths && pendingDeaths.length > 0 ? pendingDeaths.length : (payment.activeDeathReport ? 1 : 0);
                  const totalPages = Math.ceil(totalEvents / itemsPerPage) || 1;
                  const activePage = Math.min(deathCurrentPage, totalPages);

                  const paginatedDeaths = pendingDeaths && pendingDeaths.length > 0
                    ? pendingDeaths.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage)
                    : [];

                  return (
                    <>
                      <div className="table-scroll-container">
                        <table className="dashboard-table-premium">
                          <thead>
                            <tr>
                              <th>સ્વર્ગસ્થ સભ્યનું નામ</th>
                              <th>ગામ</th>
                              <th>મૃત્યુ તારીખ</th>
                              <th>અંતિમ તારીખ</th>
                              <th>રકમ per Member</th>
                              <th>સ્થિતિ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedDeaths.length > 0 ? (
                              paginatedDeaths.map((event) => (
                                <tr key={event.id || event._id || event.name}>
                                  <td><strong>{event.name}</strong></td>
                                  <td><span className="village-badge-table">{event.village}</span></td>
                                  <td>{event.deathDate}</td>
                                  <td>{event.dueDate}</td>
                                  <td><strong style={{ color: '#166534' }}>₹{event.amount || 50}</strong></td>
                                  <td><span className="status-pill active" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>🟢 સક્રિય (Active)</span></td>
                                </tr>
                              ))
                            ) : payment.activeDeathReport ? (
                              <tr>
                                <td><strong>{payment.activeDeathReport.deceasedName}</strong></td>
                                <td><span className="village-badge-table">{payment.activeDeathReport.village}</span></td>
                                <td>{payment.activeDeathReport.deathDate}</td>
                                <td>{payment.activeDeathReport.dueDate}</td>
                                <td><strong style={{ color: '#166534' }}>₹50</strong></td>
                                <td><span className="status-pill active" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>🟢 સક્રિય (Active)</span></td>
                              </tr>
                            ) : (
                              <tr>
                                <td colSpan="6" style={{ textAlign: 'center', color: '#64748b' }}>કોઈ સક્રિય મરણ નોંધ નથી.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Cards View for Recently Active Death Events */}
                      <div className="death-report-mobile-cards">
                        {paginatedDeaths.length > 0 ? (
                          paginatedDeaths.map((event) => (
                            <div key={event.id || event._id || event.name} className="death-report-card" style={{ marginBottom: '12px' }}>
                              <div className="death-report-card-header">
                                <div>
                                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>{event.name}</h4>
                                  <span className="village-badge-table" style={{ marginTop: '4px', display: 'inline-block' }}>{event.village}</span>
                                </div>
                                <strong style={{ color: '#166534', fontSize: '1.1rem' }}>₹{event.amount || 50}</strong>
                              </div>
                              <div className="death-report-card-body">
                                <div className="info-row"><span>📅 મૃત્યુ તારીખ:</span> <span>{event.deathDate}</span></div>
                                <div className="info-row"><span>⏳ અંતિમ તારીખ:</span> <span>{event.dueDate}</span></div>
                                <div className="info-row">
                                  <span>📌 સ્થિતિ:</span>
                                  <span className="status-pill active" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', fontSize: '0.75rem', padding: '2px 8px' }}>🟢 સક્રિય (Active)</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : payment.activeDeathReport ? (
                          <div className="death-report-card">
                            <div className="death-report-card-header">
                              <div>
                                <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>{payment.activeDeathReport.deceasedName}</h4>
                                <span className="village-badge-table" style={{ marginTop: '4px', display: 'inline-block' }}>{payment.activeDeathReport.village}</span>
                              </div>
                              <strong style={{ color: '#166534', fontSize: '1.1rem' }}>₹50</strong>
                            </div>
                            <div className="death-report-card-body">
                              <div className="info-row"><span>📅 મૃત્યુ તારીખ:</span> <span>{payment.activeDeathReport.deathDate}</span></div>
                              <div className="info-row"><span>⏳ અંતિમ તારીખ:</span> <span>{payment.activeDeathReport.dueDate}</span></div>
                              <div className="info-row">
                                <span>📌 સ્થિતિ:</span>
                                <span className="status-pill active" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', fontSize: '0.75rem', padding: '2px 8px' }}>🟢 સક્રિય (Active)</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#64748b', padding: '20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            કોઈ સક્રિય મરણ નોંધ નથી.
                          </div>
                        )}
                      </div>

                      {/* Death Events Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #cbd5e1', flexWrap: 'wrap', gap: '10px' }}>
                          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>
                            કુલ <strong>{totalEvents}</strong> સદગત નોંધોમાંથી <strong>{(activePage - 1) * itemsPerPage + 1} - {Math.min(activePage * itemsPerPage, totalEvents)}</strong> દર્શાવેલ છે (પેજ {activePage} / {totalPages})
                          </span>

                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              disabled={activePage === 1}
                              onClick={() => setDeathCurrentPage(prev => Math.max(prev - 1, 1))}
                              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: activePage === 1 ? '#f1f5f9' : '#ffffff', color: activePage === 1 ? '#94a3b8' : '#1e3a8a', cursor: activePage === 1 ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                            >
                              ◄ પાછળ (Previous)
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                              <button
                                key={pg}
                                onClick={() => setDeathCurrentPage(pg)}
                                style={{ padding: '6px 12px', borderRadius: '6px', border: pg === activePage ? '1.5px solid #2563eb' : '1px solid #cbd5e1', background: pg === activePage ? '#2563eb' : '#ffffff', color: pg === activePage ? '#ffffff' : '#475569', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                              >
                                {pg}
                              </button>
                            ))}

                            <button
                              disabled={activePage === totalPages}
                              onClick={() => setDeathCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: activePage === totalPages ? '#f1f5f9' : '#ffffff', color: activePage === totalPages ? '#94a3b8' : '#1e3a8a', cursor: activePage === totalPages ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                            >
                              આગળ (Next) ►
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Admin Death Reports Tab */}
          {tab === "death_reports" && (
            <div className="page-card death-reports-panel animate-fade-in">
              <div className="panel-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h2 style={{ color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                      📊 સદગત સહાય ફંડ રિપોર્ટ & એનાલિટિક્સ
                    </h2>
                    <p className="panel-subtitle" style={{ margin: '5px 0 0 0' }}>
                      સ્વર્ગસ્થ સભ્યના કલ્યાણ ફંડ માટે ચૂકવેલ અને બાકી સભ્યોની સંપૂર્ણ યાદી
                    </p>
                  </div>
                  <span style={{ background: '#dbeafe', color: '#1e40af', fontWeight: '700', padding: '6px 16px', borderRadius: '20px', border: '1px solid #bfdbfe' }}>
                    👑 એડમિન પોર્ટલ
                  </span>
                </div>
              </div>

              {/* Add Death Event Modal */}
              {showAddDeathModal && (
                <div className="add-death-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
                  <div className="add-death-modal-content" style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, color: '#1e3a8a', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        💐 નવી સદગત મરણ નોંધ ઉમેરો
                      </h3>
                      <button onClick={() => setShowAddDeathModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>×</button>
                    </div>

                    <form onSubmit={handleAddDeathSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                          👤 સ્વર્ગસ્થ સભ્યનું પૂરું નામ *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="દા.ત. શ્રી રમેશભાઈ પરમાર"
                          value={deathForm.name}
                          onChange={(e) => setDeathForm({ ...deathForm, name: e.target.value })}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                        />
                      </div>

                      <div className="form-grid-2col">
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                            🏘 સભ્યનું ગામ (Registered Village) *
                          </label>
                          <select
                            required
                            value={deathForm.village}
                            onChange={(e) => setDeathForm({ ...deathForm, village: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', background: '#ffffff', cursor: 'pointer' }}
                          >
                            <option value="">-- નોંધાયેલ ગામ પસંદ કરો --</option>
                            {availableVillages.map((v) => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                            📅 મૃત્યુ તારીખ (Calendar) *
                          </label>
                          <input
                            type="date"
                            required
                            value={deathForm.deathDate}
                            onChange={(e) => setDeathForm({ ...deathForm, deathDate: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', background: '#ffffff', cursor: 'pointer' }}
                          />
                        </div>
                      </div>

                      <div className="form-grid-2col">
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                            ⏳ ચુકવણીની અંતિમ તારીખ (Calendar Due Date) *
                          </label>
                          <input
                            type="date"
                            required
                            value={deathForm.dueDate}
                            onChange={(e) => setDeathForm({ ...deathForm, dueDate: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', background: '#ffffff', cursor: 'pointer' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                            💰 સહાય ફંડ રકમ (પ્રતિ સભ્ય)
                          </label>
                          <input
                            type="number"
                            required
                            value={deathForm.amount}
                            onChange={(e) => setDeathForm({ ...deathForm, amount: Number(e.target.value) })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setShowAddDeathModal(false)}
                          style={{ padding: '9px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                        >
                          રદ કરો
                        </button>
                        <button
                          type="submit"
                          disabled={deathLoading}
                          style={{ padding: '9px 20px', background: '#1e3a8a', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
                        >
                          {deathLoading ? "સાચવી રહ્યું..." : "💾 સહાય ફંડ જાહેર કરો"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Event Header Banner */}
              <div className="event-header-banner" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)', border: '1.5px solid #bfdbfe', borderRadius: '12px', padding: '16px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                  <span style={{ fontSize: '2rem' }}>💐</span>
                  <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                    {payment.activeDeathReport ? (
                      <>
                        <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.05rem', wordBreak: 'break-word' }}>
                          ચાલુ મરણ સહાય: <strong>{payment.activeDeathReport.deceasedName}</strong> ({payment.activeDeathReport.village})
                        </h3>
                        <p style={{ margin: '3px 0 0 0', color: '#64748b', fontSize: '0.85rem', wordBreak: 'break-word' }}>
                          મૃત્યુ તારીખ: {payment.activeDeathReport.deathDate} • અંતિમ તારીખ: {payment.activeDeathReport.dueDate} • નિયમિત યોગદાન: ₹50/સભ્ય
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.05rem', wordBreak: 'break-word' }}>
                          ચાલુ મરણ સહાય: <strong>કોઈ સક્રિય મરણ સહાય નોંધાયેલ નથી</strong>
                        </h3>
                        <p style={{ margin: '3px 0 0 0', color: '#64748b', fontSize: '0.85rem', wordBreak: 'break-word' }}>
                          એડમિન દ્વારા નવી સદગત નોંધ ઉમેરવામાં આવ્યા બાદ અહીં અને સભ્યોના એકાઉન્ટમાં ચુકવણી દર્શાવવામાં આવશે.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial Summary Cards */}
              <div className="financial-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
                <div className="financial-summary-card" style={{ background: '#f8fafc', padding: '14px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>👥 કુલ સભ્યો Target</span>
                  <h3 style={{ margin: '4px 0 0 0', color: '#0f172a', fontSize: '1.3rem' }}>{payment.analytics?.totalMembers || payment.totalMembers || 0} સભ્યો</h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>લક્ષ્યાંક: ₹{payment.analytics?.totalTargetAmount || 0}</span>
                </div>

                <div className="financial-summary-card" style={{ background: '#f0fdf4', padding: '14px 12px', borderRadius: '10px', border: '1px solid #bbf7d0', cursor: 'pointer', boxSizing: 'border-box' }} onClick={() => setReportFilter('paid')}>
                  <span style={{ fontSize: '0.8rem', color: '#166534', display: 'block' }}>🟢 એકત્રિત રકમ (ચૂકવેલ)</span>
                  <h3 style={{ margin: '4px 0 0 0', color: '#15803d', fontSize: '1.3rem' }}>₹{payment.analytics?.totalCollectedAmount || 0}</h3>
                  <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '600' }}>{payment.analytics?.paidUsersCount || 0} સભ્યોએ રકમ ચૂકવી</span>
                </div>

                <div className="financial-summary-card" style={{ background: '#fef2f2', padding: '14px 12px', borderRadius: '10px', border: '1px solid #fecaca', cursor: 'pointer', boxSizing: 'border-box' }} onClick={() => setReportFilter('pending')}>
                  <span style={{ fontSize: '0.8rem', color: '#991b1b', display: 'block' }}>🔴 બાકી રકમ (ચુકવણી બાકી)</span>
                  <h3 style={{ margin: '4px 0 0 0', color: '#dc2626', fontSize: '1.3rem' }}>₹{payment.analytics?.remainingPendingAmount || 0}</h3>
                  <span style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: '600' }}>{payment.analytics?.pendingUsersCount || 0} સભ્યોની રકમ બાકી</span>
                </div>

                <div className="financial-summary-card" style={{ background: '#eff6ff', padding: '14px 12px', borderRadius: '10px', border: '1px solid #bfdbfe', boxSizing: 'border-box' }}>
                  <span style={{ fontSize: '0.8rem', color: '#1e40af', display: 'block' }}>📈 કલેક્શન પૂર્ણતા</span>
                  <h3 style={{ margin: '4px 0 0 0', color: '#1d4ed8', fontSize: '1.3rem' }}>{payment.analytics?.progressPercentage || 0}%</h3>
                  <div style={{ marginTop: '8px', background: '#dbeafe', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${payment.analytics?.progressPercentage || 0}%`, background: '#2563eb', height: '100%' }}></div>
                  </div>
                </div>
              </div>

              {/* Filter Buttons & Search Wrapper */}
              <div className="report-controls-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
                <div className="report-filter-buttons" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: '1 1 280px' }}>
                  <button
                    onClick={() => setReportFilter('paid')}
                    style={{
                      flex: '1 1 130px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      background: reportFilter === 'paid' ? '#166534' : '#f1f5f9',
                      color: reportFilter === 'paid' ? '#ffffff' : '#475569',
                      boxShadow: reportFilter === 'paid' ? '0 4px 10px rgba(22,101,52,0.2)' : 'none'
                    }}
                  >
                    🟢 ચૂકવણી કરેલ ({(payment.paidUsersList || []).length})
                  </button>
                  <button
                    onClick={() => setReportFilter('pending')}
                    style={{
                      flex: '1 1 130px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      background: reportFilter === 'pending' ? '#dc2626' : '#f1f5f9',
                      color: reportFilter === 'pending' ? '#ffffff' : '#475569',
                      boxShadow: reportFilter === 'pending' ? '0 4px 10px rgba(220,38,38,0.2)' : 'none'
                    }}
                  >
                    🔴 ચુકવણી બાકી ({(payment.pendingUsersList || []).length})
                  </button>
                </div>

                <div className="search-wrapper" style={{ position: 'relative', height: '44px', maxH: '44px', margin: 0, flex: '1 1 220px', width: '100%', boxSizing: 'border-box' }}>
                  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#94a3b8', pointerEvents: 'none', zIndex: 2 }}>
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input className="search-box-premium" placeholder="નામ કે ગામથી શોધો..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', height: '44px', padding: '10px 14px 10px 42px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Paid Members View */}
              {reportFilter === 'paid' && (
                <>
                  <div className="scroll-hint-bar">👈 ડાબે-જમણે સ્ક્રૉલ કરો (Scroll Side-to-Side) 👉</div>
                  <div className="table-scroll-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%', boxSizing: 'border-box' }}>
                    <table className="dashboard-table-premium" style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th>સભ્યનું નામ</th>
                          <th>મોબાઇલ નંબર</th>
                          <th>ગામ</th>
                          <th>ચૂકવણી તારીખ & સમય</th>
                          <th>રકમ</th>
                          <th>પેમેન્ટ ID</th>
                          <th>રસીદ નંબર</th>
                          <th>ક્રિયા</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(payment.paidUsersList || [])
                          .filter(u => matchesSearch(u, search))
                          .map((row) => (
                            <tr key={row.id}>
                              <td><strong>{row.name}</strong></td>
                              <td>📞 {row.mobile}</td>
                              <td><span className="village-badge-table">{row.village}</span></td>
                              <td>{row.payDate}</td>
                              <td><strong style={{ color: '#059669' }}>₹{row.amount}</strong></td>
                              <td><code style={{ fontSize: '0.82rem', color: '#475569', background: '#f1f5f9', padding: '3px 7px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>{row.paymentId}</code></td>
                              <td><span style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: '600' }}>🧾 {row.receiptNumber}</span></td>
                              <td>
                                <button
                                  onClick={() => generateReceiptPDF(row, profile)}
                                  style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
                                >
                                  📥 PDF
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Paid Members Mobile Cards View */}
                  <div className="death-report-mobile-cards" style={{ width: '100%', boxSizing: 'border-box' }}>
                    {(payment.paidUsersList || [])
                      .filter(u => matchesSearch(u, search))
                      .map((row) => (
                        <div key={row.id} className="death-report-card" style={{ width: '100%', boxSizing: 'border-box' }}>
                          <div className="death-report-card-header">
                            <div>
                              <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>{row.name}</h4>
                              <span className="village-badge-table" style={{ marginTop: '4px', display: 'inline-block' }}>{row.village}</span>
                            </div>
                            <strong style={{ color: '#059669', fontSize: '1.1rem' }}>₹{row.amount}</strong>
                          </div>
                          <div className="death-report-card-body">
                            <div className="info-row"><span>📞 મોબાઇલ:</span> <strong>{row.mobile}</strong></div>
                            <div className="info-row"><span>📅 તારીખ & સમય:</span> <span>{row.payDate}</span></div>
                            <div className="info-row"><span>💳 પેમેન્ટ ID:</span> <code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{row.paymentId}</code></div>
                            <div className="info-row"><span>🧾 રસીદ:</span> <span style={{ color: '#2563eb', fontWeight: '600' }}>{row.receiptNumber}</span></div>
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                              <button
                                onClick={() => generateReceiptPDF(row, profile)}
                                style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                              >
                                📥 રસીદ PDF ડાઉનલોડ કરો
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}

              {/* Pending Members View */}
              {reportFilter === 'pending' && (
                <>
                  <div className="scroll-hint-bar">👈 ડાબે-જમણે સ્ક્રૉલ કરો (Scroll Side-to-Side) 👉</div>
                  <div className="table-scroll-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%', boxSizing: 'border-box' }}>
                    <table className="dashboard-table-premium" style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th>સભ્યનું નામ</th>
                          <th>મોબાઇલ નંબર</th>
                          <th>ગામ</th>
                          <th>બાકી સહાય ફંડ</th>
                          <th>અંતિમ તારીખ</th>
                          <th>સ્થિતિ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(payment.pendingUsersList || [])
                          .filter(u => matchesSearch(u, search))
                          .map((u) => (
                            <tr key={u.id}>
                              <td><strong>{u.name}</strong></td>
                              <td>📞 {u.mobile}</td>
                              <td><span className="village-badge-table">{u.village}</span></td>
                              <td><strong style={{ color: '#dc2626' }}>₹{u.amount}</strong></td>
                              <td>{u.dueDate}</td>
                              <td><span className="status-pill pending" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>⚠️ બાકી (Pending)</span></td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pending Members Mobile Cards View */}
                  <div className="death-report-mobile-cards" style={{ width: '100%', boxSizing: 'border-box', marginTop: '4px' }}>
                    {(payment.pendingUsersList || [])
                      .filter(u => matchesSearch(u, search))
                      .map((u) => (
                        <div key={u.id} className="death-report-card" style={{ width: '100%', boxSizing: 'border-box' }}>
                          <div className="death-report-card-header">
                            <div>
                              <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>{u.name}</h4>
                              <span className="village-badge-table" style={{ marginTop: '4px', display: 'inline-block' }}>{u.village}</span>
                            </div>
                            <strong style={{ color: '#dc2626', fontSize: '1.1rem' }}>₹{u.amount}</strong>
                          </div>
                          <div className="death-report-card-body">
                            <div className="info-row"><span>📞 મોબાઇલ:</span> <strong>{u.mobile}</strong></div>
                            <div className="info-row"><span>⏳ અંતિમ તારીખ:</span> <span>{u.dueDate}</span></div>
                            <div className="info-row">
                              <span>📌 સ્થિતિ:</span>
                              <span className="status-pill pending" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: '0.75rem', padding: '2px 8px' }}>⚠️ બાકી (Pending)</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Payment Interface Tab */}
          {tab === "payment" && (
            <div className="payment-tab-container animate-fade-in">
              <div className="payment-split-layout">

                {/* Left Column: Active Pending Deaths List */}
                <div className="page-card payment-receipt-card">
                  <div className="receipt-header">
                    <span className="flower-icon">💐</span>
                    <h2>સહાય ફંડ ચુકવણી</h2>
                    <p className="receipt-desc">સદગતના પરિવારોને મદદ માટે ચાલુ યોગદાન ફંડ</p>
                  </div>

                  <div className="receipt-body">
                    <label className="section-label" style={{ fontWeight: '600', color: '#4a5568', display: 'block', marginBottom: '10px' }}>
                      બાકી વિગતો (ચાલુ સહાય ફંડ)
                    </label>

                    <div className="pending-list-section" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                      {pendingDeaths.length > 0 ? (
                        pendingDeaths.map((item) => {
                          const familyMult = payment.familyCoveredMembers || (1 + familyMembers.filter(m => m.status === 'approved').length) || 1;
                          const singleFee = Number(item.amount) > 0 ? Number(item.amount) : 50;
                          const baseFamilyAmount = singleFee * familyMult;
                          const passed = isDueDatePassed(item.dueDate);
                          const calculatedItemAmount = passed ? baseFamilyAmount + (50 * familyMult) : baseFamilyAmount;
                          return (
                            <div key={item.id} className="pending-death-item" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', background: '#f8fafc', borderRadius: '10px', border: passed ? '1.5px solid #f87171' : '1.5px solid #cbd5e1' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <div className="death-item-info" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                  <span className="death-icon" style={{ fontSize: '1.4rem' }}>💐</span>
                                  <div>
                                    <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1.05rem' }}>{item.name}</h4>
                                    <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>{item.village} • અંતિમ તારીખ: {item.dueDate}</p>
                                  </div>
                                </div>
                                <div className="death-item-amount" style={{ textAlign: 'right' }}>
                                  <div style={{ fontWeight: '800', color: passed ? '#ef4444' : '#1e3a8a', fontSize: '1.2rem' }}>
                                    ₹{calculatedItemAmount}
                                  </div>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                                    ({familyMult} સભ્યો × ₹{singleFee})
                                  </span>
                                </div>
                              </div>

                              <div style={{ fontSize: '0.82rem', color: '#1e40af', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 10px', borderRadius: '6px', fontWeight: '600' }}>
                                👨‍👩‍👧‍👦 કુટુંબ કુલ નોંધાયેલ મંજૂર સભ્યો: <strong>{familyMult} સભ્યો</strong> (૧ મોભી + {familyMult - 1} સભ્યો)
                              </div>

                              {passed ? (
                                <div style={{ fontSize: '0.85rem', color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: '6px', fontWeight: '600' }}>
                                  ⚠️ સમયસર ચુકવણી ન કરવા બદલ પ્રતિ સભ્ય ₹૫૦ લેટ ફી પેનલ્ટી (+₹{50 * familyMult}) ઉમેરાયેલ છે.
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.82rem', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '6px 10px', borderRadius: '6px' }}>
                                  💡 માહિતી: છેલ્લી તારીખ ({item.dueDate}) સુધીમાં ચુકવણી પૂર્ણ કરશો નહીં તો પ્રતિ સભ્ય ₹૫૦ લેટ ફી પેનલ્ટી ઉમેરાશે.
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div style={{
                          background: '#f0fdf4',
                          border: '1.5px solid #bbf7d0',
                          padding: '30px 20px',
                          borderRadius: '12px',
                          textAlign: 'center',
                          boxShadow: '0 4px 12px rgba(22, 101, 52, 0.05)'
                        }}>
                          <div style={{ fontSize: '3rem', color: '#166534', lineHeight: 1, marginBottom: '12px' }}>✓</div>
                          <h3 style={{ color: '#166534', fontSize: '1.25rem', fontWeight: '700', margin: '0 0 8px 0' }}>
                            કોઈ ચુકવણી બાકી નથી!
                          </h3>
                          <p style={{ color: '#15803d', fontSize: '0.92rem', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                            તમારી બધી જ સહાય ફંડ ચુકવણીઓ સફળતાપૂર્વક પૂર્ણ થઈ ગઈ છે. પંચશીલ સમાજ સેવા અને સહયોગ માટે તમારો આભાર!
                          </p>
                          <span style={{
                            display: 'inline-block',
                            background: '#dcfce7',
                            color: '#166534',
                            fontWeight: '700',
                            padding: '6px 16px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            border: '1px solid #86efac'
                          }}>
                            ✓ સ્થિતિ: ચૂકવણી પૂર્ણ (PAID)
                          </span>
                        </div>
                      )}
                    </div>

                    {pendingDeaths.length > 0 && (
                      <>
                        <div className="receipt-divider"></div>

                        <div className="receipt-row highlight">
                          <span className="label">💰 તમારું કુલ યોગદાન:</span>
                          <span className="value price">₹{totalAmount}</span>
                        </div>

                        {totalAmount > 0 && (
                          <>
                            <div className="payment-status-banner pending" style={{ marginTop: '15px', backgroundColor: '#fffaf0', borderColor: '#feebc8' }}>
                              <span className="status-icon" style={{ color: '#dd6b20' }}>!</span>
                              <div className="status-text">
                                <h4 style={{ color: '#dd6b20' }}>ચુકવણી બાકી</h4>
                                <p style={{ color: '#718096' }}>કૃપા કરીને પેનલ્ટીથી બચવા છેલ્લી તારીખ પહેલાં ચુકવણી પૂર્ણ કરો.</p>
                              </div>
                            </div>

                            <button className="premium-pay-btn active" onClick={handlePayment} style={{ marginTop: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                              ₹{totalAmount} સુરક્ષિત ચૂકવો
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Right Column: History List */}
                <div className="page-card payment-history-card">
                  <div className="panel-header">
                    <h2>📜 ભૂતકાળની ચુકવણીનો ઇતિહાસ</h2>
                    <p className="panel-subtitle">તમારા દ્વારા કરવામાં આવેલ અગાઉની સહાય ફંડ વિગતો</p>
                  </div>

                  <div className="table-responsive-desktop">
                    <table className="dashboard-table-premium">
                      <thead>
                        <tr>
                          <th>મૃત સભ્ય</th>
                          <th>ગામ</th>
                          <th>મૃત્યુ તારીખ</th>
                          <th>ચુકવણી તારીખ</th>
                          <th>કુલ રકમ</th>
                          <th>પેમેન્ટ ID</th>
                          <th>રસીદ નંબર</th>
                          <th>સ્થિતિ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map((row, index) => {
                          const displayStatus = (row.status === "completed" || row.status === "Paid" || !row.status) ? "ચૂકવણી થઈ ગઈ છે" : row.status;
                          const pId = row.paymentId || row.razorpayPaymentId || `pay_${(row.id || row._id || index).toString().slice(-8)}`;
                          const rcpNo = row.receiptNumber || `RCP-2026-${(row.id || row._id || index).toString().slice(-4).toUpperCase()}`;
                          const rawPayDate = row.payDate || row.paymentDate;
                          const displayPayDate = (rawPayDate && rawPayDate !== "-") ? rawPayDate : (new Date().toLocaleDateString('en-GB') + ', ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));

                          return (
                            <tr key={row.id || row._id || index}>
                              <td><strong>{row.name || row.deceasedName || "સહાય ફંડ"}</strong></td>
                              <td>{row.village || "-"}</td>
                              <td>{row.deathDate || "-"}</td>
                              <td>{displayPayDate}</td>
                              <td><strong style={{ color: '#059669', fontSize: '0.95rem' }}>₹{row.amount || 50}</strong></td>
                              <td><code style={{ fontSize: '0.82rem', color: '#475569', background: '#f1f5f9', padding: '3px 7px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>{pId}</code></td>
                              <td>
                                <button
                                  onClick={() => generateReceiptPDF(row, profile)}
                                  title="રસીદ પ્રિન્ટ / PDF ડાઉનલોડ કરો"
                                  style={{
                                    fontSize: '0.82rem',
                                    color: '#2563eb',
                                    fontWeight: '600',
                                    background: '#eff6ff',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #bfdbfe',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  🧾 {rcpNo} 📥 PDF
                                </button>
                              </td>
                              <td><span className="status-pill paid">{displayStatus}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="table-responsive-mobile">
                    <div className="history-mobile-list">
                      {paymentHistory.map((row, index) => {
                        const displayStatus = (row.status === "completed" || row.status === "Paid" || !row.status) ? "ચૂકવણી થઈ ગઈ છે" : row.status;
                        const pId = row.paymentId || row.razorpayPaymentId || `pay_${(row.id || row._id || index).toString().slice(-8)}`;
                        const rcpNo = row.receiptNumber || `RCP-2026-${(row.id || row._id || index).toString().slice(-4).toUpperCase()}`;
                        const rawPayDate = row.payDate || row.paymentDate;
                        const displayPayDate = (rawPayDate && rawPayDate !== "-") ? rawPayDate : (new Date().toLocaleDateString('en-GB') + ', ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));

                        return (
                          <div key={row.id || row._id || index} className="history-mobile-card">
                            <div className="history-card-header">
                              <h4>{row.name || row.deceasedName || "સહાય ફંડ"}</h4>
                              <span className="status-pill paid">{displayStatus}</span>
                            </div>
                            <div className="history-card-body">
                              <div className="info-row"><span>🏘 ગામ:</span><span>{row.village || "-"}</span></div>
                              <div className="info-row"><span>💐 મૃત્યુ તારીખ:</span><span>{row.deathDate || "-"}</span></div>
                              <div className="info-row"><span>📅 ચુકવણી તારીખ:</span><span>{displayPayDate}</span></div>
                              <div className="info-row"><span>💰 કુલ રકમ:</span><strong style={{ color: '#059669' }}>₹{row.amount || 50}</strong></div>
                              <div className="info-row"><span>🆔 પેમેન્ટ ID:</span><code style={{ fontSize: '0.82rem', color: '#475569', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{pId}</code></div>
                              <div style={{ marginTop: '10px' }}>
                                <button
                                  onClick={() => generateReceiptPDF(row, profile)}
                                  style={{
                                    width: '100%',
                                    fontSize: '0.88rem',
                                    color: '#1d4ed8',
                                    fontWeight: '700',
                                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid #bfdbfe',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 5px rgba(37,99,235,0.08)'
                                  }}
                                >
                                  🧾 {rcpNo} • 📥 PDF રસીદ ડાઉનલોડ
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* Member Details Inspection Modal */}
          {inspectItem && (
            <div className="add-death-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
              <div className="add-death-modal-content" style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '540px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, color: '#1e3a8a', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🔍 સભ્ય સંપૂર્ણ વિગત ચકાસણી પત્રક (Member Verification)
                  </h3>
                  <button onClick={() => setInspectItem(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {checkIsDuplicate(inspectItem) && (
                    <div style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700' }}>
                      ⚠️ ચેતવણી: આ જ મોબાઇલ નંબર અથવા સમાન નામ ધરાવતો સભ્ય સમાજ રેકોર્ડમાં પૂર્વેથી જ સાચવેલ છે. કૃપા કરીને કોલ કરીને ખાતરી કરો.
                    </div>
                  )}

                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>👤 સભ્યનું પૂરું નામ</span><strong style={{ color: '#0f172a', fontSize: '1rem' }}>{inspectItem.name}</strong></div>
                    <div><span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>🤝 પ્રકાર / સંબંધ</span><strong style={{ color: '#1e40af', fontSize: '0.95rem' }}>{inspectItem.type === 'family' ? `${inspectItem.relation} (પરિવાર સભ્ય)` : 'મુખ્ય નોંધણી સભ્ય'}</strong></div>
                    <div><span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>📞 મોબાઇલ નંબર</span><a href={`tel:${inspectItem.mobile || inspectItem.familyHead?.mobile}`} style={{ color: '#2563eb', fontWeight: '800', fontSize: '0.95rem', textDecoration: 'none' }}>{inspectItem.mobile || inspectItem.familyHead?.mobile || 'N/A'} 📲 (કોલ કરો)</a></div>
                    <div><span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>🏘 ગામ</span><strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{inspectItem.village || inspectItem.familyHead?.village || 'N/A'}</strong></div>
                    <div><span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>🎂 ઉંમર & જાતિ</span><strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{inspectItem.age ? `${inspectItem.age} વર્ષ` : 'N/A'} • {inspectItem.gender || 'N/A'}</strong></div>
                    <div><span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>💼 વ્યવસાય / કામગીરી</span><strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{inspectItem.occupation || 'ઉપલબ્ધ નથી'}</strong></div>
                  </div>

                  {inspectItem.type === 'family' && inspectItem.familyHead && (
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 14px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: '700', display: 'block' }}>👑 કુટુંબના મોભી (Family Head Details)</span>
                      <div style={{ marginTop: '4px', fontSize: '0.9rem', color: '#1e3a8a', fontWeight: '600' }}>
                        {inspectItem.familyHead.name} • 📞 <a href={`tel:${inspectItem.familyHead.mobile}`} style={{ color: '#2563eb' }}>{inspectItem.familyHead.mobile}</a> • 🏘 {inspectItem.familyHead.village}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <a
                      href={`tel:${inspectItem.mobile || inspectItem.familyHead?.mobile}`}
                      style={{ flex: 1, textAlign: 'center', background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd', padding: '10px', borderRadius: '8px', fontWeight: '700', textDecoration: 'none', fontSize: '0.9rem' }}
                    >
                      📞 સભ્યને કોલ કરો
                    </a>
                    {inspectItem.type === 'registration' ? (
                      <>
                        <button onClick={() => { handleUserApproval(inspectItem._id, 'approved'); setInspectItem(null); }} style={{ flex: 1, background: '#166534', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}>
                          ✅ મંજૂર કરો
                        </button>
                        <button onClick={() => { handleUserApproval(inspectItem._id, 'rejected'); setInspectItem(null); }} style={{ flex: 1, background: '#dc2626', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}>
                          ❌ નામંજૂર કરો
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { handleFamilyApproval(inspectItem._id, 'approved'); setInspectItem(null); }} style={{ flex: 1, background: '#166534', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}>
                          ✅ મંજૂર કરો
                        </button>
                        <button onClick={() => { setSelectedSubMember(inspectItem); setRejectModalOpen(true); setInspectItem(null); }} style={{ flex: 1, background: '#dc2626', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}>
                          ❌ નામંજૂર કરો
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile Photo Lightbox & Management Modal */}
          {showAvatarModal && (
            <div className="dp-modal-overlay" onClick={() => setShowAvatarModal(false)}>
              <div className="dp-modal-card animate-scale-up" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="dp-modal-header">
                  <div className="dp-modal-title">
                    <span className="dp-modal-icon">👤</span>
                    <h3>પ્રોફાઇલ ફોટો</h3>
                  </div>
                  <button className="dp-modal-close-btn" onClick={() => setShowAvatarModal(false)} title="બંધ કરો">
                    ✕
                  </button>
                </div>

                {/* Main Lightbox Hero Section */}
                <div className="dp-hero-container">
                  <div className="dp-photo-wrapper">
                    {selectedAvatarChoice ? (
                      <img src={selectedAvatarChoice} alt="Profile DP" className="dp-main-photo" />
                    ) : (
                      <div className="dp-initials-avatar">
                        {profile?.name ? profile.name.charAt(0).toUpperCase() : "👤"}
                      </div>
                    )}
                  </div>

                  <div className="dp-user-info">
                    <h4>{profile?.name || "સમાજ સભ્ય"}</h4>
                    <span className="dp-status-badge">
                      {selectedAvatarChoice ? (selectedAvatarChoice === profile?.avatar ? "✓ હાલનો પ્રોફાઇલ ફોટો" : "✨ નવો પસંદ કરેલ ફોટો") : "કોઈ ફોટો સેટ નથી"}
                    </span>
                  </div>

                  {/* Action Bar */}
                  <div className="dp-actions-bar">
                    <label htmlFor="dpFileInput" className="dp-action-btn primary">
                      📷 નવો ફોટો અપલોડ કરો
                    </label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="dpFileInput" 
                      onChange={handleCustomPhotoSelect} 
                      style={{ display: "none" }}
                    />

                    <button 
                      type="button" 
                      className={`dp-action-btn secondary ${avatarActiveTab === "gallery" ? "active" : ""}`}
                      onClick={() => setAvatarActiveTab(avatarActiveTab === "gallery" ? "view" : "gallery")}
                    >
                      🎨 અવતાર ગેલેરી
                    </button>

                    {selectedAvatarChoice && (
                      <button 
                        type="button" 
                        className="dp-action-btn danger"
                        onClick={() => {
                          setSelectedAvatarChoice("");
                          setCustomAvatarPreview("");
                        }}
                        title="ફોટો કાઢી નાખો"
                      >
                        🗑️ કાઢી નાખો
                      </button>
                    )}
                  </div>
                </div>

                {/* Error Banner if any */}
                {avatarModalError && (
                  <div className="dp-alert-error">
                    ⚠️ {avatarModalError}
                  </div>
                )}

                {/* Preset Avatar Gallery Drawer */}
                {avatarActiveTab === "gallery" && (
                  <div className="dp-gallery-drawer">
                    <h5 className="dp-drawer-title">અવતાર પસંદ કરો:</h5>
                    <div className="dp-gallery-grid">
                      {presetAvatars.map((url, idx) => (
                        <div 
                          key={idx}
                          className={`dp-gallery-item ${selectedAvatarChoice === url ? "selected" : ""}`}
                          onClick={() => setSelectedAvatarChoice(url)}
                        >
                          <img src={url} alt={`Avatar ${idx + 1}`} />
                          {selectedAvatarChoice === url && <div className="dp-item-check">✓</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="dp-modal-footer">
                  <button 
                    type="button" 
                    className="dp-footer-btn save"
                    onClick={handleSaveAvatar}
                    disabled={avatarSaveLoading}
                  >
                    {avatarSaveLoading ? "સાચવી રહ્યું..." : "💾 સાચવો"}
                  </button>
                  <button 
                    type="button" 
                    className="dp-footer-btn cancel" 
                    onClick={() => setShowAvatarModal(false)}
                  >
                    ❌ રદ કરો
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
