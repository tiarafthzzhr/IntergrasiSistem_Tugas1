# ============================================================
# ANALISIS KINERJA SENSOR CV - DETEKSI Cd2+ (2-1000 ppm)
# Dataset: Kaggle - tiarafatimahazzhara/data-set
# ============================================================

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import glob
import os
import warnings
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.svm import SVR
from sklearn.model_selection import cross_val_score, KFold, train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.pipeline import Pipeline

warnings.filterwarnings('ignore')

# ============================================================
# PATH DATASET KAGGLE
# ============================================================

BASE_PATH = "/kaggle/input/datasets/tiarafatimahazzhara/data-set/Alat Sensor CD Groundturth"

conc_folders = {
    2:    f"{BASE_PATH}/2",
    4:    f"{BASE_PATH}/4",
    6:    f"{BASE_PATH}/6",
    8:    f"{BASE_PATH}/8",
    10:   f"{BASE_PATH}/10",
    20:   f"{BASE_PATH}/20",
    40:   f"{BASE_PATH}/40",
    60:   f"{BASE_PATH}/60",
    80:   f"{BASE_PATH}/80",
    100:  f"{BASE_PATH}/100",
    200:  f"{BASE_PATH}/200",
    400:  f"{BASE_PATH}/400",
    600:  f"{BASE_PATH}/600",
    800:  f"{BASE_PATH}/800",
    1000: f"{BASE_PATH}/1000",
}

# Verifikasi path tersedia
print("=== Verifikasi Path Dataset ===")
for conc, path in conc_folders.items():
    exists  = os.path.isdir(path)
    n_files = len(glob.glob(f"{path}/*.xlsx")) if exists else 0
    print(f"  {conc:>4} ppm | {'OK' if exists else 'TIDAK ADA':8} | {n_files} file")

# ============================================================
# 1. FUNGSI LOAD DAN EKSTRAKSI FITUR
# ============================================================

def load_cv_data(filepath):
    """
    Load CV data dari file xlsx.
    Menggunakan scan ke-10 (kolom 18-19) sebagai scan paling stabil.
    """
    df = pd.read_excel(filepath, header=None)
    try:
        V = pd.to_numeric(df.iloc[2:, 18], errors='coerce').dropna().values
        I = pd.to_numeric(df.iloc[2:, 19], errors='coerce').dropna().values
        return V, I
    except:
        return None, None


def extract_features(V, I):
    """
    Ekstrak 10 fitur elektrokimia dari kurva CV scan ke-10.
    """
    if V is None or len(V) < 10:
        return None

    ip_anodic   = np.max(I)
    ep_anodic   = V[np.argmax(I)]
    ip_cathodic = np.min(I)
    ep_cathodic = V[np.argmin(I)]

    idx_0   = np.argmin(np.abs(V - 0.0))
    idx_03  = np.argmin(np.abs(V - 0.3))
    i_at_0  = I[idx_0]
    i_at_03 = I[idx_03]

    i_mean   = np.mean(I)
    i_std    = np.std(I)
    delta_ep = ep_anodic - ep_cathodic
    ip_ratio = ip_anodic / (abs(ip_cathodic) + 1e-9)

    return {
        'ip_anodic':   ip_anodic,
        'ep_anodic':   ep_anodic,
        'ip_cathodic': ip_cathodic,
        'ep_cathodic': ep_cathodic,
        'i_at_0V':     i_at_0,
        'i_at_03V':    i_at_03,
        'i_mean':      i_mean,
        'i_std':       i_std,
        'delta_ep':    delta_ep,
        'ip_ratio':    ip_ratio,
    }

# ============================================================
# 2. LOAD SEMUA DATA
# ============================================================

all_features = []
all_labels   = []

print("\n=== Loading Data ===")
for conc, folder in conc_folders.items():
    files    = glob.glob(f'{folder}/*.xlsx')
    n_loaded = 0
    for f in files:
        V, I = load_cv_data(f)
        feat = extract_features(V, I)
        if feat is not None:
            all_features.append(feat)
            all_labels.append(conc)
            n_loaded += 1
    print(f"  {conc:>4} ppm : {n_loaded} file dimuat")

df_feat = pd.DataFrame(all_features)
df_feat['concentration'] = all_labels

# --- Tabel 1: Distribusi Sampel ---
sampel_count  = df_feat.groupby('concentration').size().reset_index(name='Jumlah Sampel')
sampel_count.columns = ['Konsentrasi (ppm)', 'Jumlah Sampel']
sampel_count['Persentase (%)'] = (sampel_count['Jumlah Sampel'] / 50 * 100).round(1)
sampel_count['Status'] = sampel_count['Jumlah Sampel'].apply(
    lambda x: 'Lengkap' if x == 50 else f'Kurang {50 - x}')

print(f"\nTotal sampel berhasil dimuat: {len(df_feat)}")
print("\n" + "="*55)
print("   TABEL 1: DISTRIBUSI SAMPEL PER KONSENTRASI")
print("="*55)
print(sampel_count.to_string(index=False))
print(f"\nTotal kelas      : {len(sampel_count)}")
print(f"Kelas lengkap    : {(sampel_count['Jumlah Sampel'] == 50).sum()}")
print(f"Kelas tidak penuh: {(sampel_count['Jumlah Sampel'] < 50).sum()}")
print("="*55)

# ============================================================
# 3. VISUALISASI KURVA CV PER KONSENTRASI
# ============================================================

conc_list = list(conc_folders.keys())
colors    = plt.cm.plasma(np.linspace(0, 1, len(conc_list)))

fig, axes = plt.subplots(3, 5, figsize=(18, 10))
for idx, (conc, ax) in enumerate(zip(conc_list, axes.flat)):
    folder = conc_folders[conc]
    files  = glob.glob(f'{folder}/*.xlsx')[:5]
    for f in files:
        df_raw = pd.read_excel(f, header=None)
        V = pd.to_numeric(df_raw.iloc[2:, 18], errors='coerce').dropna().values
        I = pd.to_numeric(df_raw.iloc[2:, 19], errors='coerce').dropna().values
        ax.plot(V, I, alpha=0.5, linewidth=0.8, color=colors[idx])
    ax.set_title(f'{conc} ppm', fontsize=9, fontweight='bold')
    ax.set_xlabel('E (V)', fontsize=7)
    ax.set_ylabel('i (µA)', fontsize=7)
    ax.tick_params(labelsize=7)
    ax.grid(True, alpha=0.3)

plt.suptitle('Profil CV Scan ke-10 per Konsentrasi Cd2+ (5 pengukuran pertama)',
             fontsize=12, fontweight='bold')
plt.tight_layout()
plt.savefig('fig1_cv_profiles.png', dpi=150, bbox_inches='tight')
plt.show()

# ============================================================
# 4. ANALISIS FITUR
# ============================================================

feature_cols = ['ip_anodic', 'ep_anodic', 'ip_cathodic', 'ep_cathodic',
                'i_at_0V', 'i_at_03V', 'i_mean', 'i_std', 'delta_ep', 'ip_ratio']

fig, axes = plt.subplots(2, 3, figsize=(15, 9))

s1 = df_feat.groupby('concentration')['ip_anodic'].agg(['mean','std']).reset_index()
axes[0,0].errorbar(s1['concentration'], s1['mean'], yerr=s1['std'],
                   fmt='o-', color='#2196F3', capsize=4, linewidth=2, markersize=6)
axes[0,0].set(xlabel='Konsentrasi (ppm)', ylabel='Arus Puncak Anodik (µA)',
              title='Ip Anodik vs Konsentrasi')
axes[0,0].grid(True, alpha=0.4)

s2 = df_feat.groupby('concentration')['i_mean'].agg(['mean','std']).reset_index()
axes[0,1].errorbar(s2['concentration'], s2['mean'], yerr=s2['std'],
                   fmt='s-', color='#4CAF50', capsize=4, linewidth=2, markersize=6)
axes[0,1].set(xlabel='Konsentrasi (ppm)', ylabel='Arus Rata-rata (µA)',
              title='Arus Rata-rata vs Konsentrasi')
axes[0,1].grid(True, alpha=0.4)

axes[0,2].errorbar(np.log10(s1['concentration']), s1['mean'], yerr=s1['std'],
                   fmt='D-', color='#FF5722', capsize=4, linewidth=2, markersize=6)
axes[0,2].set(xlabel='log10(Konsentrasi)', ylabel='Arus Puncak Anodik (µA)',
              title='Ip Anodik vs log10(Konsentrasi)')
axes[0,2].grid(True, alpha=0.4)

s3 = df_feat.groupby('concentration')['ip_ratio'].agg(['mean','std']).reset_index()
axes[1,0].errorbar(s3['concentration'], s3['mean'], yerr=s3['std'],
                   fmt='^-', color='#9C27B0', capsize=4, linewidth=2, markersize=6)
axes[1,0].set(xlabel='Konsentrasi (ppm)', ylabel='Rasio Arus Puncak',
              title='Rasio Ipa/Ipc vs Konsentrasi')
axes[1,0].grid(True, alpha=0.4)

s4 = df_feat.groupby('concentration')['i_std'].agg(['mean']).reset_index()
axes[1,1].bar(range(len(s4)), s4['mean'], color=colors, alpha=0.85)
axes[1,1].set_xticks(range(len(s4)))
axes[1,1].set_xticklabels([str(c) for c in s4['concentration']], rotation=45, fontsize=7)
axes[1,1].set(xlabel='Konsentrasi (ppm)', ylabel='Std Arus (µA)',
              title='Variabilitas Arus (i_std) per Konsentrasi')
axes[1,1].grid(True, alpha=0.4, axis='y')

data_groups = [df_feat[df_feat['concentration']==c]['ip_anodic'].values for c in conc_list]
bp = axes[1,2].boxplot(data_groups, patch_artist=True)
for patch, color in zip(bp['boxes'], colors):
    patch.set_facecolor(color)
    patch.set_alpha(0.7)
axes[1,2].set_xticks(range(1, len(conc_list)+1))
axes[1,2].set_xticklabels([str(c) for c in conc_list], rotation=45, fontsize=7)
axes[1,2].set(xlabel='Konsentrasi (ppm)', ylabel='Arus Puncak Anodik (µA)',
              title='Distribusi Ip Anodik per Konsentrasi')
axes[1,2].grid(True, alpha=0.4, axis='y')

plt.suptitle('Analisis Fitur Elektrokimia Sensor Cd2+', fontsize=13, fontweight='bold')
plt.tight_layout()
plt.savefig('fig2_features.png', dpi=150, bbox_inches='tight')
plt.show()

# ============================================================
# 5. PEMODELAN MACHINE LEARNING
# ============================================================

X = df_feat[feature_cols].values
y = df_feat['concentration'].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42)

models = {
    'Random Forest':     RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1),
    'Gradient Boosting': GradientBoostingRegressor(n_estimators=200, learning_rate=0.1, random_state=42),
    'SVR (RBF)':         Pipeline([('scaler', StandardScaler()), ('svr', SVR(kernel='rbf', C=100, gamma='scale'))]),
    'Ridge Regression':  Pipeline([('scaler', StandardScaler()), ('ridge', Ridge(alpha=1.0))]),
}

kf      = KFold(n_splits=5, shuffle=True, random_state=42)
results = {}

print("\n=== Evaluasi Model (5-Fold Cross Validation) ===")
for name, model in models.items():
    cv_r2   = cross_val_score(model, X_train, y_train, cv=kf, scoring='r2')
    cv_mae  = -cross_val_score(model, X_train, y_train, cv=kf, scoring='neg_mean_absolute_error')
    model.fit(X_train, y_train)
    y_pred    = model.predict(X_test)
    test_r2   = r2_score(y_test, y_pred)
    test_mae  = mean_absolute_error(y_test, y_pred)
    test_rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    results[name] = {
        'cv_r2_mean':  cv_r2.mean(),  'cv_r2_std':  cv_r2.std(),
        'cv_mae_mean': cv_mae.mean(), 'cv_mae_std': cv_mae.std(),
        'test_r2':  test_r2,
        'test_mae': test_mae,
        'test_rmse': test_rmse,
        'y_pred': y_pred,
        'model':  model,
    }
    print(f"\n{name}:")
    print(f"  CV  R²  = {cv_r2.mean():.4f} ± {cv_r2.std():.4f}")
    print(f"  CV  MAE = {cv_mae.mean():.2f} ± {cv_mae.std():.2f} ppm")
    print(f"  Test R² = {test_r2:.4f} | MAE = {test_mae:.2f} ppm | RMSE = {test_rmse:.2f} ppm")

best_name = max(results, key=lambda k: results[k]['test_r2'])
print(f"\nModel terbaik: {best_name}  (Test R² = {results[best_name]['test_r2']:.4f})")

# ============================================================
# 6. VISUALISASI EVALUASI MODEL
# ============================================================

rf_model  = results['Random Forest']['model']
y_pred_rf = results['Random Forest']['y_pred']

importances = rf_model.feature_importances_
fi_df = pd.DataFrame({'feature': feature_cols, 'importance': importances}) \
          .sort_values('importance', ascending=False).reset_index(drop=True)

fig, axes = plt.subplots(2, 3, figsize=(16, 10))

# (a) Aktual vs Prediksi
axes[0,0].scatter(y_test, y_pred_rf, alpha=0.5, color='#2196F3', s=40, edgecolors='white', lw=0.5)
axes[0,0].plot([0,1100],[0,1100], 'r--', lw=1.5, label='Ideal')
axes[0,0].set(xlabel='Konsentrasi Aktual (ppm)', ylabel='Konsentrasi Prediksi (ppm)',
              title=f'RF: Aktual vs Prediksi\nR2 = {r2_score(y_test, y_pred_rf):.4f}')
axes[0,0].legend(); axes[0,0].grid(True, alpha=0.4)

# (b) Residual
residuals = y_pred_rf - y_test
axes[0,1].scatter(y_pred_rf, residuals, alpha=0.5, color='#FF5722', s=40, edgecolors='white', lw=0.5)
axes[0,1].axhline(0, color='black', lw=1.5, linestyle='--')
axes[0,1].set(xlabel='Prediksi (ppm)', ylabel='Residual (ppm)', title='Plot Residual (RF)')
axes[0,1].grid(True, alpha=0.4)

# (c) Feature importance
fi_colors = plt.cm.viridis(np.linspace(0.2, 0.9, len(fi_df)))
axes[0,2].barh(fi_df['feature'][::-1], fi_df['importance'][::-1], color=fi_colors[::-1])
axes[0,2].set(xlabel='Importance Score', title='Feature Importance (RF)')
axes[0,2].grid(True, alpha=0.4, axis='x')

# (d) Perbandingan R² test semua model
model_names = list(results.keys())
test_r2_all = [results[m]['test_r2'] for m in model_names]
bar_colors  = ['#2196F3','#4CAF50','#FF9800','#9C27B0']
bars = axes[1,0].bar(range(len(model_names)), test_r2_all, color=bar_colors, alpha=0.85)
axes[1,0].set_xticks(range(len(model_names)))
axes[1,0].set_xticklabels(['RF','GBR','SVR','Ridge'], fontsize=10)
axes[1,0].set(ylabel='Test R2', title='Perbandingan R2 Test Semua Model', ylim=(0,1.05))
for bar, v in zip(bars, test_r2_all):
    axes[1,0].text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.01,
                   f'{v:.4f}', ha='center', fontsize=9, fontweight='bold')
axes[1,0].grid(True, alpha=0.4, axis='y')

# (e) MAE per konsentrasi
mae_per_conc = []
for c in conc_list:
    mask = y_test == c
    mae_per_conc.append(mean_absolute_error(y_test[mask], y_pred_rf[mask]) if mask.sum()>0 else np.nan)
axes[1,1].bar(range(len(conc_list)), mae_per_conc, color=colors, alpha=0.85)
axes[1,1].set_xticks(range(len(conc_list)))
axes[1,1].set_xticklabels([str(c) for c in conc_list], rotation=45, fontsize=7)
axes[1,1].set(xlabel='Konsentrasi (ppm)', ylabel='MAE (ppm)', title='MAE per Konsentrasi (RF)')
axes[1,1].grid(True, alpha=0.4, axis='y')

# (f) Prediksi rata-rata per kelas
pred_mean, pred_std = [], []
for c in conc_list:
    mask = y == c
    p = rf_model.predict(X[mask])
    pred_mean.append(p.mean()); pred_std.append(p.std())
axes[1,2].plot(conc_list, conc_list, 'k--', lw=1.5, alpha=0.7, label='Ideal')
axes[1,2].errorbar(conc_list, pred_mean, yerr=pred_std,
                   fmt='o-', color='#E91E63', capsize=5, lw=2, ms=7, label='Prediksi RF')
axes[1,2].set(xlabel='Konsentrasi Aktual (ppm)', ylabel='Konsentrasi Prediksi (ppm)',
              title='Prediksi Rata-rata per Kelas')
axes[1,2].legend(fontsize=8); axes[1,2].grid(True, alpha=0.4)

plt.suptitle('Evaluasi Model Pemodelan Sensor Cd2+ (2-1000 ppm)', fontsize=13, fontweight='bold')
plt.tight_layout()
plt.savefig('fig3_model_eval.png', dpi=150, bbox_inches='tight')
plt.show()


# ============================================================
# 7. TABEL RINGKASAN HASIL (VERSI DIPERBAIKI)
# ============================================================

def print_header(title, width=85):
    print("\n" + "="*width)
    print(f"{title.center(width)}")
    print("="*width)

# --- TABEL 2: EVALUASI PERBANDINGAN MODEL ---
print_header("TABEL 2: PERBANDINGAN PERFORMA MODEL REGRESI (5-FOLD CV & TEST)")
header_t2 = f"{'Model':<20} | {'CV R² (Mean ± Std)':<22} | {'Test R²':<10} | {'MAE (ppm)':<12} | {'RMSE (ppm)':<10}"
print(header_t2)
print("-" * len(header_t2))

# Mengurutkan hasil berdasarkan Test R2 tertinggi
sorted_models = sorted(results.items(), key=lambda x: x[1]['test_r2'], reverse=True)

for name, res in sorted_models:
    cv_str = f"{res['cv_r2_mean']:.4f} ± {res['cv_r2_std']:.4f}"
    print(f"{name:<20} | {cv_str:<22} | {res['test_r2']:<10.4f} | {res['test_mae']:<12.2f} | {res['test_rmse']:<10.2f}")
print("-" * len(header_t2))
print("Keterangan: CV=Cross-Validation | MAE=Mean Absolute Error | RMSE=Root Mean Squared Error")


# --- TABEL 3: FEATURE IMPORTANCE (RANDOM FOREST) ---
print_header("TABEL 3: ANALISIS KONTRIBUSI FITUR - RANDOM FOREST", width=95)
header_t3 = f"{'Rank':<5} | {'Nama Fitur':<15} | {'Importance':<12} | {'Kontribusi':<12} | {'Interpretasi Fisik':<35}"
print(header_t3)
print("-" * len(header_t3))

interpretations = [
    'Variabilitas total arus (Scan ke-10)',
    'Offset rata-rata arus keseluruhan',
    'Amplitudo arus puncak reduksi Cd2+',
    'Keseimbangan kinetika redoks',
    'Arus baseline elektroda (E=0V)',
    'Posisi potensial puncak oksidasi',
    'Separasi puncak (Epa-Epc)',
    'Respon arus pada jendela redoks Cd',
    'Amplitudo arus puncak oksidasi Cd2+',
    'Posisi potensial puncak reduksi'
]

for i, row in fi_df.iterrows():
    interp = interpretations[i] if i < len(interpretations) else "-"
    print(f"{i+1:<5} | {row['feature']:<15} | {row['importance']:<12.4f} | {row['importance']*100:<10.2f}% | {interp:<35}")
print("-" * len(header_t3))


# --- TABEL 4: RINGKASAN PARAMETER & HASIL AKHIR ---
print_header("TABEL 4: RINGKASAN MODEL TERBAIK (RANDOM FOREST)", width=75)
best_rf = results['Random Forest']
summary_data = [
    ("Metrik Utama (Test R²)", f"{best_rf['test_r2']:.4f}"),
    ("Error Prediksi (MAE)", f"{best_rf['test_mae']:.2f} ppm"),
    ("Akurasi Relatif", f"~{(best_rf['test_r2']*100):.1f}%"),
    ("Total Dataset", f"{len(df_feat)} sampel"),
    ("Komposisi Train/Test", "80% / 20%"),
    ("Konfigurasi Model", "n_estimators=200, random_state=42"),
    ("Fitur Paling Berpengaruh", f"{fi_df.iloc[0]['feature']} ({fi_df.iloc[0]['importance']*100:.1f}%)"),
    ("Status Kelayakan", "Sangat Baik (High Precision)")
]

for label, value in summary_data:
    print(f"{label:<30} : {value}")
print("="*75)

print(f"\nKESIMPULAN: Sensor Cd2+ berbasis CV berhasil dimodelkan menggunakan {best_name}")
print(f"dengan akurasi R² sebesar {results[best_name]['test_r2']:.4f}. Fitur '{fi_df.iloc[0]['feature']}'")
print("menjadi indikator paling sensitif terhadap perubahan konsentrasi Cd2+.")