# Reference: Clean Architecture trong React Native

---

## Layers

```
┌─────────────────────────────────┐
│  Presentation Layer             │  ← Screens, Components, ViewModels
│  (React Native UI)              │
├─────────────────────────────────┤
│  Domain Layer                   │  ← Use Cases, Entities, Repository Interfaces
│  (Business Logic — Pure JS/TS)  │
├─────────────────────────────────┤
│  Data Layer                     │  ← Repository Implementations, APIs, Storage
│  (Implementation Details)       │
└─────────────────────────────────┘
```

**Dependency Rule:** Outer layers phụ thuộc vào inner layers, KHÔNG ngược lại.
- Data layer implement interfaces định nghĩa trong Domain layer
- Presentation layer chỉ biết về Domain layer

---

## Domain Layer — Business Logic

```tsx
// domain/entities/User.ts
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

// domain/repositories/UserRepository.ts
// Interface — Domain không biết gì về implementation
export interface UserRepository {
  getById(id: string): Promise<User>;
  update(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

// domain/usecases/GetUserProfile.ts
// Use case = một business operation cụ thể
export class GetUserProfile {
  constructor(private userRepository: UserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.userRepository.getById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}

// domain/usecases/UpdateUserProfile.ts
export class UpdateUserProfile {
  constructor(private userRepository: UserRepository) {}

  async execute(userId: string, updates: Partial<User>): Promise<User> {
    const user = await this.userRepository.getById(userId);
    const updated = { ...user, ...updates };
    await this.userRepository.update(updated);
    return updated;
  }
}
```

---

## Data Layer — Implementation

```tsx
// data/api/userApiClient.ts
interface UserApiResponse {
  id: string;
  full_name: string;    // snake_case từ API
  email_address: string;
  user_role: string;
}

// data/repositories/UserRepositoryImpl.ts
import { UserRepository } from '@domain/repositories/UserRepository';
import { User } from '@domain/entities/User';

export class UserRepositoryImpl implements UserRepository {
  constructor(
    private apiClient: ApiClient,
    private cache: CacheStorage,
  ) {}

  async getById(id: string): Promise<User> {
    // Cache first
    const cached = this.cache.get<User>(`user:${id}`);
    if (cached) return cached;

    // Fetch từ API
    const response = await this.apiClient.get<UserApiResponse>(`/users/${id}`);

    // Map API response → Domain entity
    const user: User = {
      id: response.id,
      name: response.full_name,
      email: response.email_address,
      role: response.user_role as User['role'],
    };

    this.cache.set(`user:${id}`, user, { ttl: 300 }); // cache 5 phút
    return user;
  }

  async update(user: User): Promise<void> {
    await this.apiClient.put(`/users/${user.id}`, {
      full_name: user.name,
      email_address: user.email,
    });
    this.cache.invalidate(`user:${user.id}`);
  }

  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/users/${id}`);
    this.cache.invalidate(`user:${id}`);
  }
}
```

---

## Dependency Injection

```tsx
// di/container.ts
// Tạo và wire up các dependencies

import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl';
import { GetUserProfile } from '@domain/usecases/GetUserProfile';
import { UpdateUserProfile } from '@domain/usecases/UpdateUserProfile';
import { apiClient } from '@services/api/client';
import { cache } from '@services/cache';

// Simple DI container
const userRepository = new UserRepositoryImpl(apiClient, cache);

export const useCases = {
  getUserProfile: new GetUserProfile(userRepository),
  updateUserProfile: new UpdateUserProfile(userRepository),
};

// Presentation layer chỉ import useCases, không biết implementation
```

---

## Presentation Layer — ViewModel Pattern

```tsx
// presentation/viewmodels/useUserProfileViewModel.ts
import { useCases } from '@di/container';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '@domain/entities/User';

export function useUserProfileViewModel(userId: string) {
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => useCases.getUserProfile.execute(userId),
  });

  const { mutate: updateProfile, isPending: isUpdating } = useMutation({
    mutationFn: (updates: Partial<User>) =>
      useCases.updateUserProfile.execute(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });

  return { user, isLoading, error, updateProfile, isUpdating };
}

// presentation/screens/UserProfileScreen.tsx
// Screen chỉ handle UI, không business logic
function UserProfileScreen({ route }: Props) {
  const { userId } = route.params;
  const { user, isLoading, updateProfile } = useUserProfileViewModel(userId);

  if (isLoading) return <LoadingView />;
  if (!user) return <ErrorView />;

  return (
    <View>
      <Text>{user.name}</Text>
      <Button
        label="Edit Profile"
        onPress={() => navigation.navigate('EditProfile', { userId })}
      />
    </View>
  );
}
```

---

## Testing benefits

```tsx
// Domain use cases dễ test — pure functions, không UI
describe('UpdateUserProfile', () => {
  it('should update user and invalidate cache', async () => {
    const mockRepo: UserRepository = {
      getById: jest.fn().mockResolvedValue({ id: '1', name: 'John', email: 'j@test.com', role: 'user' }),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn(),
    };

    const useCase = new UpdateUserProfile(mockRepo);
    const result = await useCase.execute('1', { name: 'Jane' });

    expect(mockRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Jane' })
    );
    expect(result.name).toBe('Jane');
  });
});
```

---

## Khi nào cần Clean Architecture?

**Nên dùng khi:**
- App có business logic phức tạp
- Team lớn (phân tách trách nhiệm rõ ràng)
- Cần test coverage cao
- Domain logic cần tái dùng (web + mobile)

**Không cần khi:**
- App đơn giản (CRUD + display)
- Team nhỏ, deadline gấp
- Prototype/MVP

**Middle ground (feature-based + hooks):**
- Screens → Hooks → API
- Không cần đầy đủ Repository/UseCase pattern
- Vẫn dễ test và maintain
