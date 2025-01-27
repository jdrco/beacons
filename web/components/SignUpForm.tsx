"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface ValidationError {
  msg: string;
}

export function SignUpForm({
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    re_password: '',
    fname: '',
    lname: '',
    education_level: '',
    share_profile: true,
    active: true
  })

  const [error, setError] = useState<string | null>(null)

  const validatePassword = (password: string) => {
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter."
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number."
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return "Password must contain at least one special character."
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate passwords match
    if (formData.password !== formData.re_password) {
      setError("Passwords do not match")
      return
    }

    // Validate password strength
    const passwordError = validatePassword(formData.password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    // Validate education level
    if (formData.education_level &&
      !["Undergraduate", "Graduate"].includes(formData.education_level)) {
      setError("Education level must be either Undergraduate or Graduate")
      return
    }

    setIsLoading(true)

    const dataToSend = {
      ...formData,
      active: Boolean(formData.active),
      share_profile: Boolean(formData.share_profile)
    }

    console.log('Sending form data:', dataToSend)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Validation error:', data)
        if (data.detail) {
          throw new Error(Array.isArray(data.detail)
            ? data.detail.map((err: ValidationError) => err.msg).join(', ')
            : data.detail
          )
        }
        throw new Error(data.message || 'Something went wrong')
      }

      toast({
        title: "Success!",
        description: "Account created successfully. Please log in.",
      })

      router.push('/login')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create account"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    setError(null)
  }

  const handleEducationChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      education_level: value
    }))
    setError(null)
  }

  return (
    <div {...props}>
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            Create a new account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fname">First Name</Label>
                  <Input
                    id="fname"
                    name="fname"
                    type="text"
                    value={formData.fname}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lname">Last Name</Label>
                  <Input
                    id="lname"
                    name="lname"
                    type="text"
                    value={formData.lname}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="re_password">Re-type Password</Label>
                <Input
                  id="re_password"
                  name="re_password"
                  type="password"
                  value={formData.re_password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="education_level">Education Level</Label>
                <Select
                  value={formData.education_level}
                  onValueChange={handleEducationChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select education level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                    <SelectItem value="Graduate">Graduate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="text-sm text-red-500">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Sign Up"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <a href="/login" className="underline underline-offset-4 hover:text-primary">
                Login
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
