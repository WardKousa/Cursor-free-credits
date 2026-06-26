package com.example.cusforfreecredits.user.api;

import com.example.cusforfreecredits.authentication.RequiresRole;
import com.example.cusforfreecredits.authentication.Role;
import com.example.cusforfreecredits.user.api.model.UserProfile;
import io.fluxzero.sdk.persisting.eventsourcing.Apply;
import jakarta.validation.constraints.NotNull;

@RequiresRole(Role.ADMIN)
public record SetRole(@NotNull UserId userId, Role role) implements UserUpdate {
    @Apply
    UserProfile apply(UserProfile profile) {
        return profile.toBuilder().role(role).build();
    }
}
