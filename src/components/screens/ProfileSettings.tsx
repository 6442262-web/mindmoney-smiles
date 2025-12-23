import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Camera, Eye, EyeOff, User, Calendar as CalendarIcon, Shield, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserSettings } from "@/hooks/useUserSettings";

const profileSchema = z.object({
  fullName: z.string()
    .min(1, "ชื่อเต็มต้องมีอย่างน้อย 1 ตัวอักษร")
    .max(50, "ชื่อเต็มต้องไม่เกิน 50 ตัวอักษร")
    .regex(/\S/, "ชื่อเต็มต้องมีตัวอักษรที่ไม่ใช่ช่องว่าง"),
  email: z.string()
    .email("รูปแบบอีเมลไม่ถูกต้อง"),
  phoneNumber: z.string()
    .regex(/^0[0-9]{9}$/, "หมายเลขโทรศัพท์ต้องเป็นรูปแบบ 0XXXXXXXXX"),
  dateOfBirth: z.date({
    required_error: "กรุณาเลือกวันเกิด",
  }),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านปัจจุบัน"),
  newPassword: z.string()
    .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
    .regex(/(?=.*[a-z])/, "ต้องมีตัวพิมพ์เล็ก")
    .regex(/(?=.*[A-Z])/, "ต้องมีตัวพิมพ์ใหญ่")
    .regex(/(?=.*\d)/, "ต้องมีตัวเลข")
    .regex(/(?=.*[@$!%*?&])/, "ต้องมีอักษรพิเศษ"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "รหัสผ่านไม่ตรงกัน",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export function ProfileSettings() {
  const { toast } = useToast();
  const { settings, updateSettings } = useUserSettings();
  const [profileImage, setProfileImage] = useState<string>("/placeholder.svg");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [formChanged, setFormChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate minimum date (13 years ago)
  const today = new Date();
  const minDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      dateOfBirth: new Date(1990, 0, 1),
    },
  });

  // Load user data from Supabase
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Load user settings
        if (settings) {
          profileForm.reset({
            fullName: settings.display_name || user.user_metadata?.full_name || "",
            email: user.email || "",
            phoneNumber: settings.phone_number || "",
            dateOfBirth: settings.date_of_birth ? new Date(settings.date_of_birth) : new Date(1990, 0, 1),
          });

          // Load avatar
          if (settings.avatar_url) {
            const { data } = supabase.storage
              .from('avatars')
              .getPublicUrl(settings.avatar_url);
            setProfileImage(data.publicUrl);
          }

          setTwoFactorEnabled(settings.two_factor_enabled || false);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [settings]);

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "ไฟล์ใหญ่เกินไป",
        description: "กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 2MB",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      toast({
        title: "ไฟล์ไม่ถูกต้อง",
        description: "กรุณาเลือกไฟล์ .jpg หรือ .png เท่านั้น",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update user settings
      await updateSettings({ avatar_url: fileName });

      // Update preview
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      setProfileImage(data.publicUrl);

      toast({
        title: "อัปโหลดสำเร็จ",
        description: "รูปโปรไฟล์ของคุณได้รับการอัปเดตแล้ว",
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถอัปโหลดรูปภาพได้",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Update user metadata (email is handled separately)
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: data.fullName,
        }
      });

      if (metadataError) throw metadataError;

      // Update user settings
      await updateSettings({
        display_name: data.fullName,
        phone_number: data.phoneNumber,
        date_of_birth: format(data.dateOfBirth, 'yyyy-MM-dd'),
      });

      // Update email if changed
      if (data.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: data.email,
        });
        
        if (emailError) throw emailError;
        
        toast({
          title: "บันทึกสำเร็จ",
          description: "ข้อมูลส่วนตัวของคุณได้รับการอัปเดตแล้ว กรุณาตรวจสอบอีเมลใหม่เพื่อยืนยัน",
        });
      } else {
        toast({
          title: "บันทึกสำเร็จ",
          description: "ข้อมูลส่วนตัวของคุณได้รับการอัปเดตแล้ว",
        });
      }

      setFormChanged(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถบันทึกข้อมูลได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setLoading(true);
    try {
      // Verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('No user email found');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.currentPassword,
      });

      if (signInError) {
        throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง');
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) throw updateError;

      toast({
        title: "เปลี่ยนรหัสผ่านสำเร็จ",
        description: "รหัสผ่านใหม่ของคุณได้รับการอัปเดตแล้ว",
      });
      setShowPasswordModal(false);
      passwordForm.reset();
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = () => {
    setFormChanged(true);
  };

  const handleTwoFactorToggle = async (enabled: boolean) => {
    try {
      await updateSettings({ two_factor_enabled: enabled });
      setTwoFactorEnabled(enabled);
      toast({
        title: enabled ? "เปิดใช้งาน 2FA แล้ว" : "ปิดใช้งาน 2FA แล้ว",
        description: enabled ? "บัญชีของคุณมีความปลอดภัยเพิ่มขึ้น" : "2FA ได้ถูกปิดใช้งานแล้ว",
      });
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเปลี่ยนการตั้งค่า 2FA ได้",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="pb-20 px-4 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">การตั้งค่าข้อมูลส่วนตัว</h1>
      </div>

      <Form {...profileForm}>
        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
          {/* Profile Picture */}
          <Card className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profileImage} alt="Profile" />
                  <AvatarFallback>
                    <User className="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  size="icon"
                  className="absolute -bottom-2 -right-2 rounded-full w-8 h-8"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  คลิกเพื่อเปลี่ยนรูปโปรไฟล์
                </p>
                <p className="text-xs text-muted-foreground">
                  รองรับ .jpg, .png ขนาดสูงสุด 2MB
                </p>
              </div>
            </div>
          </Card>

          {/* Personal Information */}
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold mb-4">ข้อมูลส่วนตัว</h3>
            
            <FormField
              control={profileForm.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อเต็ม</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFormChange();
                      }}
                      placeholder="กรอกชื่อเต็มของคุณ"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={profileForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>อีเมล</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      onChange={(e) => {
                        field.onChange(e);
                        handleFormChange();
                      }}
                      placeholder="กรอกอีเมลของคุณ"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    ระบบจะส่งอีเมลยืนยันเมื่อคุณเปลี่ยนอีเมล
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={profileForm.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>หมายเลขโทรศัพท์</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFormChange();
                      }}
                      placeholder="0812345678"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={profileForm.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>วันเกิด</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>เลือกวันเกิด</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          handleFormChange();
                        }}
                        disabled={(date) => date > minDate || date < new Date("1900-01-01")}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    ต้องมีอายุอย่างน้อย 13 ปี
                  </p>
                </FormItem>
              )}
            />
          </Card>

          {/* Security Settings */}
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold mb-4">ความปลอดภัย</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>เปลี่ยนรหัสผ่าน</Label>
                  <p className="text-sm text-muted-foreground">
                    อัปเดตรหัสผ่านของคุณ
                  </p>
                </div>
                <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
                  <DialogTrigger asChild>
                    <Button variant="outline">เปลี่ยนรหัสผ่าน</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>เปลี่ยนรหัสผ่าน</DialogTitle>
                    </DialogHeader>
                    <Form {...passwordForm}>
                      <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                        <FormField
                          control={passwordForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>รหัสผ่านปัจจุบัน</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    {...field}
                                    type={showCurrentPassword ? "text" : "password"}
                                    placeholder="กรอกรหัสผ่านปัจจุบัน"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                  >
                                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={passwordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>รหัสผ่านใหม่</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    {...field}
                                    type={showNewPassword ? "text" : "password"}
                                    placeholder="กรอกรหัสผ่านใหม่"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                  >
                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                              <p className="text-xs text-muted-foreground">
                                ขั้นต่ำ 8 ตัวอักษร ต้องมีตัวพิมพ์ใหญ่ ตัวเลข และอักษรพิเศษ
                              </p>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={passwordForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ยืนยันรหัสผ่านใหม่</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    {...field}
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="ยืนยันรหัสผ่านใหม่"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowPasswordModal(false)}
                          >
                            ยกเลิก
                          </Button>
                          <Button type="submit">
                            บันทึก
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div className="space-y-1">
                    <Label>การยืนยันตัวตนสองขั้นตอน (2FA)</Label>
                    <p className="text-sm text-muted-foreground">
                      เพิ่มความปลอดภัยให้กับบัญชีของคุณ
                    </p>
                  </div>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={handleTwoFactorToggle}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <div className="space-y-1">
                    <Label>จัดการอุปกรณ์ที่ล็อกอินอยู่</Label>
                    <p className="text-sm text-muted-foreground">
                      ดูและจัดการอุปกรณ์ที่เข้าถึงบัญชีได้
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  จัดการ
                </Button>
              </div>
            </div>
          </Card>

          {/* Save Button */}
          {formChanged && (
            <Card className="p-4">
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </Button>
            </Card>
          )}
        </form>
      </Form>
    </div>
  );
}